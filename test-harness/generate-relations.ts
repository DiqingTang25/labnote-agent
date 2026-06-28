/**
 * 为 Supabase 中所有实验生成知识图谱关系
 * 使用 service_role key 绕过 RLS
 *
 * 用法: npx tsx test-harness/generate-relations.ts
 */

import { ProxyAgent } from "undici";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = path.resolve(__dirname, "..", ".env.local");
const env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const SF_KEY = env.VITE_SF_API_KEY || "sk-yhzitgqarzjovxshluqqwuzoozcbnkiaiamncapwjqwooist";

const proxyAgent = new ProxyAgent("http://127.0.0.1:7897");

async function supabaseFetch(path: string, method = "GET", body?: any) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const resp = await fetch(url, {
    method,
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(method === "GET" ? {} : { "Prefer": "return=representation" }),
    },
    body: body ? JSON.stringify(body) : undefined,
    // @ts-ignore
    dispatcher: proxyAgent,
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error(`  API ${resp.status}: ${err.slice(0, 200)}`);
    return null;
  }
  return resp.json();
}

async function chat(messages: Array<{role:string;content:string}>) {
  const resp = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${SF_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-ai/DeepSeek-V3", messages, max_tokens: 2048, temperature: 0.3 }),
    // @ts-ignore
    dispatcher: proxyAgent,
  });
  const data = await resp.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

async function main() {
  console.log("🔗 生成知识图谱关系...\n");

  // 1. 获取所有实验
  const experiments = await supabaseFetch("experiments?select=id,name,discipline,device_name,sample_id,operator,purpose&order=created_at.asc") as any[];
  if (!experiments || experiments.length < 2) {
    console.log("  需要至少2个实验才能生成关系");
    return;
  }
  console.log(`  ${experiments.length} 个实验\n`);

  let totalRelations = 0;

  // 2. 规则引擎：共享设备/样品/操作人
  for (let i = 0; i < experiments.length; i++) {
    for (let j = i + 1; j < experiments.length; j++) {
      const a = experiments[i];
      const b = experiments[j];
      const pairs: Array<{type: string; meta: Record<string,string>}> = [];

      if (a.device_name && b.device_name && a.device_name === b.device_name) {
        pairs.push({ type: "device_shared", meta: { device: a.device_name } });
      }
      if (a.sample_id && b.sample_id && a.sample_id === b.sample_id) {
        pairs.push({ type: "sample_shared", meta: { sample: a.sample_id } });
      }
      if (a.operator && b.operator && a.operator === b.operator && a.operator !== "未提及") {
        pairs.push({ type: "operator_shared", meta: { operator: a.operator } });
      }

      for (const p of pairs) {
        const ok = await supabaseFetch("experiment_relations", "POST", {
          source_exp_id: a.id,
          target_exp_id: b.id,
          relation_type: p.type,
          metadata: p.meta,
        });
        if (ok) totalRelations++;
      }
    }
  }
  console.log(`  ✅ 规则引擎: ${totalRelations} 条关系`);

  // 3. AI 语义相似度：批量分析
  console.log(`\n  🤖 AI 语义分析...`);
  const ctx = experiments.map((e: any) => ({
    id: e.id, name: e.name, discipline: e.discipline,
    device: e.device_name, sample: e.sample_id, purpose: (e.purpose || "").slice(0, 80),
  }));

  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i];
    const others = ctx.filter((c: any) => c.id !== exp.id);
    if (others.length === 0) continue;

    const prompt = `你是科研知识图谱构建助手。找出与以下实验语义相似的实验。

【当前实验】名称: ${exp.name} | 学科: ${exp.discipline} | 设备: ${exp.device_name} | 目的: ${(exp.purpose || "").slice(0, 100)}

【候选实验】${JSON.stringify(others)}

请找出与当前实验语义最相似的实验（最多3个）。
输出纯JSON数组: [{"targetId":"...","reason":"一句话解释"}]`;

    try {
      const raw = await chat([
        { role: "system", content: "你是科研知识图谱构建助手。输出严格JSON数组。" },
        { role: "user", content: prompt },
      ]);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const suggestions = JSON.parse(match[0]);

      for (const s of suggestions) {
        if (!s.targetId) continue;
        const ok = await supabaseFetch("experiment_relations", "POST", {
          source_exp_id: exp.id,
          target_exp_id: s.targetId,
          relation_type: "semantic_similar",
          metadata: { reason: s.reason || "" },
        });
        if (ok) totalRelations++;
      }
    } catch (err: any) {
      console.error(`  AI error for ${exp.name}: ${err.message}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ 共生成 ${totalRelations} 条关系`);
  console.log(`📊 Supabase: ${SUPABASE_URL.replace("https://", "")}`);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
