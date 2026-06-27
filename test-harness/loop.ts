/**
 * Pipeline Accuracy Optimization Loop
 *
 * Continuously tests the multimodal pipeline, measures accuracy,
 * identifies weak points, and applies prompt improvements.
 *
 * Usage: npx tsx test-harness/loop.ts [--max-iterations N] [--target-score N] [--experiment name]
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_DIR = path.resolve(__dirname, "results");
const HISTORY_FILE = path.resolve(RESULTS_DIR, "loop-history.json");

type LoopState = {
  iteration: number;
  startedAt: string;
  results: Array<{
    iteration: number;
    timestamp: string;
    experiments: Array<{ name: string; score: number; issues: string[] }>;
    averageScore: number;
    promptChanges: string[];
  }>;
};

function loadState(): LoopState {
  if (fs.existsSync(HISTORY_FILE)) {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  }
  return {
    iteration: 0,
    startedAt: new Date().toISOString(),
    results: [],
  };
}

function saveState(state: LoopState) {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// ====== Prompt Improvement Engine ======

type WeakSpot = {
  field: string;
  avgScore: number;
  severity: "high" | "medium" | "low";
  suggestion: string;
};

function analyzeWeakSpots(reports: any[]): WeakSpot[] {
  const scoreKeys = [
    "nameMatch", "disciplineMatch", "purposeMatch", "operatorMatch",
    "deviceMatch", "sampleMatch", "stepsQuality", "resultsQuality",
    "paramsQuality", "fileAttachment",
  ];

  const weakSpots: WeakSpot[] = [];

  for (const key of scoreKeys) {
    const scores = reports
      .filter(r => r.scores && r.scores[key] !== undefined)
      .map(r => r.scores[key]);
    if (scores.length === 0) continue;
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

    let severity: "high" | "medium" | "low" = "low";
    if (avg < 30) severity = "high";
    else if (avg < 60) severity = "medium";

    if (severity !== "low") {
      weakSpots.push({
        field: key,
        avgScore: Math.round(avg),
        severity,
        suggestion: generateSuggestion(key, avg, reports),
      });
    }
  }

  // Sort by severity then score
  weakSpots.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity] || a.avgScore - b.avgScore;
  });

  return weakSpots;
}

function generateSuggestion(field: string, avgScore: number, reports: any[]): string {
  const suggestions: Record<string, string[]> = {
    nameMatch: [
      "在 EXTRACT_PROMPT 中强调实验名称必须从文件内容中提取具体名称，不要使用默认的'未命名实验'",
      "添加指令：'实验名称必须反映实验核心内容，如【物种+实验类型+检测方法】'",
      "在用户消息中增加提示：'请为实验取一个具体、描述性的中文名称（如：小鼠海马体LTP电生理记录）'",
    ],
    disciplineMatch: [
      "在 EXTRACT_PROMPT 中添加学科分类指引，列举常见学科：材料科学、细胞生物学、电生理学、空间转录组学、免疫学等",
      "添加指令：'discipline字段必须从文件内容推断，选择最匹配的学科名称'",
      "在系统提示中增加学科推断规则：'如果文件涉及电信号/电位记录→电生理学，如果涉及细胞迁移/免疫→免疫细胞生物学，如果涉及基因表达空间分布→空间转录组学'",
    ],
    purposeMatch: [
      "强化 purpose 字段提取要求：'必须包含研究目标+研究对象+实验方法，至少20字'",
      "添加示例格式：'通过【方法】研究【对象】的【目标】'",
    ],
    operatorMatch: [
      "在 EXTRACT_PROMPT 中强调：'operator字段必须提取操作人姓名（中文或英文），如果文件中有Dr./Prof./姓名等信息，必须提取'",
    ],
    deviceMatch: [
      "强化设备提取：'device字段必须从文件内容中提取仪器名称、型号、厂商，如果提到了仪器品牌/型号（如Axopatch、Zeiss、JEOL等），必须填写'",
      "添加设备识别提示：'常见科研设备：显微镜（SEM/TEM/共聚焦）、电生理放大器（Axopatch/Multiclamp）、测序仪（Illumina/NovaSeq）、X射线衍射仪'",
    ],
    sampleMatch: [
      "强化样品提取：'sample.id必须从文件内容中提取样品编号/ID，sample.source必须注明样品来源'",
    ],
    stepsQuality: [
      "要求步骤数量：'实验步骤必须3-15步，每步一句话，按时间/逻辑顺序排列'",
      "添加示例格式：'步骤示例：1. 将组织样本嵌入OCT化合物中 2. 在-20°C下进行10μm冰冻切片...'",
    ],
    resultsQuality: [
      "要求详细结果：'results字段必须包含200-500字的实验结果总结，包括关键数据、观察结果、统计分析结论'",
      "添加指令：'结果部分应该具体、定量化，不要使用模糊术语'",
    ],
    paramsQuality: [
      "强化参数提取：'params数组必须提取所有可测量的实验参数，每个参数有name/value/unit三要素'",
      "添加示例格式：'参数示例：name=采样率, value=44.1, unit=kHz'",
    ],
    fileAttachment: [
      "确保文件正确关联：'每个文件必须在attachedFiles数组中，并正确标注mediaType'",
    ],
  };

  const options = suggestions[field] || ["优化提示以提高提取质量"];
  // Cycle through suggestions based on iteration
  const iterIdx = Math.floor(avgScore / 20) % options.length;
  return options[iterIdx];
}

// ====== Run Single Test ======

async function runTestIteration(): Promise<{ reports: any[]; averageScore: number }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "fast-test.ts");
    const isWindows = process.platform === "win32";
    const npxCmd = isWindows ? "npx.cmd" : "npx";
    const proc = spawn(npxCmd, ["tsx", scriptPath], {
      cwd: path.resolve(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
      shell: true,
      timeout: 10 * 60 * 1000, // 10 min timeout
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text); // Show real-time progress
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on("close", (code: number | null) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Test exited with code ${code}\n${stderr.slice(-500)}`));
        return;
      }

      // Parse accuracy from stdout
      const accMatch = stdout.match(/ACCURACY:(\d+)/);
      const avgScore = accMatch ? parseInt(accMatch[1], 10) : 0;

      // Read latest report
      if (fs.existsSync(RESULTS_DIR)) {
        const reportFiles = fs.readdirSync(RESULTS_DIR)
          .filter(f => f.startsWith("accuracy-") && f.endsWith(".json"))
          .sort()
          .reverse();

        if (reportFiles.length > 0) {
          const latestReport = JSON.parse(
            fs.readFileSync(path.join(RESULTS_DIR, reportFiles[0]), "utf-8")
          );
          resolve({ reports: latestReport, averageScore: avgScore });
          return;
        }
      }

      resolve({ reports: [], averageScore: avgScore });
    });

    proc.on("error", (err: Error) => {
      reject(err);
    });
  });
}

// ====== Apply Prompt Improvements ======

function applyPromptImprovements(weakSpots: WeakSpot[], iteration: number): string[] {
  const changes: string[] = [];

  for (const spot of weakSpots) {
    if (spot.severity === "low") continue;

    // Build the improvement instruction
    const instruction = `// LOOP-I${iteration}: ${spot.field} score=${spot.avgScore} — ${spot.suggestion}`;
    changes.push(instruction);

    console.log(`\n  🔧 Improvement for ${spot.field} (score=${spot.avgScore}):`);
    console.log(`     ${spot.suggestion}`);
  }

  // Write changes to a log file for manual review
  const changesLogPath = path.resolve(RESULTS_DIR, `prompt-changes-iter${iteration}.md`);
  const logContent = `# Prompt Improvement Suggestions — Iteration ${iteration}\n\n`
    + `Date: ${new Date().toISOString()}\n\n`
    + `## Weak Spots Found\n\n`
    + weakSpots.map(s => `- **${s.field}** (${s.severity}, score=${s.avgScore}): ${s.suggestion}`).join("\n")
    + `\n\n## Recommended Changes\n\n`
    + changes.map(c => `- ${c}`).join("\n")
    + `\n\n## Manual Steps Required\n\n`
    + `1. Apply the above changes to \`src/lib/siliconflow.ts\` (EXTRACT_PROMPT) or \`src/lib/multimodal-parser.ts\` (merge prompt)\n`
    + `2. Re-run the loop to verify improvements\n`;

  fs.writeFileSync(changesLogPath, logContent, "utf-8");
  console.log(`\n  📝 Changes log: ${changesLogPath}`);

  return changes;
}

// ====== Main Loop ======

async function main() {
  const args = process.argv.slice(2);
  const maxIterIdx = args.indexOf("--max-iterations");
  const targetIdx = args.indexOf("--target-score");
  const expIdx = args.indexOf("--experiment");

  const maxIterations = maxIterIdx >= 0 ? parseInt(args[maxIterIdx + 1] || "10", 10) : 3;
  const targetScore = targetIdx >= 0 ? parseInt(args[targetIdx + 1] || "80", 10) : 80;
  const experimentFilter = expIdx >= 0 ? args[expIdx + 1] || "" : "";

  console.log("🔄 LabNote Pipeline Accuracy Optimization Loop");
  console.log(`   Max iterations: ${maxIterations}`);
  console.log(`   Target score: ${targetScore}/100`);
  console.log(`   Experiment filter: ${experimentFilter || "all"}`);
  console.log("=" .repeat(70));

  const state = loadState();
  console.log(`\n📊 Loaded state: iteration ${state.iteration}, ${state.results.length} prior runs`);

  let iteration = state.iteration + 1;

  while (iteration <= state.iteration + maxIterations) {
    console.log(`\n${"━".repeat(70)}`);
    console.log(`🔄 Iteration ${iteration} / ${state.iteration + maxIterations}`);
    console.log(`${"━".repeat(70)}`);

    try {
      // 1. Run the test
      console.log(`\n▶️  Running pipeline test...`);
      const { reports, averageScore } = await runTestIteration();

      if (reports.length === 0) {
        console.log(`\n⚠️  No results — skipping iteration`);
        iteration++;
        continue;
      }

      // 2. Analyze weak spots
      console.log(`\n🔍 Analyzing weak spots...`);
      const weakSpots = analyzeWeakSpots(reports);

      if (weakSpots.length > 0) {
        console.log(`\n⚠️  Found ${weakSpots.length} weak spots:`);
        for (const spot of weakSpots) {
          console.log(`  [${spot.severity.toUpperCase()}] ${spot.field}: ${spot.avgScore}/100 — ${spot.suggestion.slice(0, 80)}...`);
        }
      } else {
        console.log(`\n✅ All scores above threshold!`);
      }

      // 3. Generate and apply improvements
      const promptChanges = applyPromptImprovements(weakSpots, iteration);

      // 4. Record results
      state.results.push({
        iteration,
        timestamp: new Date().toISOString(),
        experiments: reports.map((r: any) => ({
          name: r.experiment,
          score: r.overallScore,
          issues: r.issues || [],
        })),
        averageScore,
        promptChanges,
      });
      state.iteration = iteration;
      saveState(state);

      // 5. Check exit conditions
      if (averageScore >= targetScore) {
        console.log(`\n🎉 Target score ${targetScore}/100 reached! Average: ${averageScore}/100`);
        break;
      }

      if (weakSpots.length === 0) {
        console.log(`\n✅ No weak spots — pipeline is optimized for current data.`);
        // Still break if above 70
        if (averageScore >= 70) break;
      }

      // 6. Wait before next iteration (rate limit consideration)
      console.log(`\n⏳ Waiting 5s before next iteration...`);
      await new Promise(r => setTimeout(r, 5000));

      iteration++;
    } catch (err: any) {
      console.error(`\n❌ Iteration ${iteration} failed: ${err.message}`);
      iteration++;
      // Continue to next iteration
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Final summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📊 LOOP COMPLETE`);
  console.log(`${"=".repeat(70)}`);

  if (state.results.length > 0) {
    const scores = state.results.map(r => r.averageScore).filter(s => s > 0);
    const finalAvg = scores.length > 0
      ? Math.round(scores[scores.length - 1])
      : 0;
    const bestAvg = scores.length > 0 ? Math.max(...scores) : 0;
    const initialAvg = scores.length > 0 ? scores[0] : 0;

    console.log(`Iterations completed: ${state.results.length}`);
    console.log(`Initial Score: ${initialAvg}/100`);
    console.log(`Final Score: ${finalAvg}/100`);
    console.log(`Best Score: ${bestAvg}/100`);
    console.log(`Improvement: ${finalAvg - initialAvg > 0 ? "+" : ""}${finalAvg - initialAvg}`);

    // Per-field trends
    if (state.results.length >= 2) {
      console.log(`\nScore Trends:`);
      const first = state.results[0].experiments;
      const last = state.results[state.results.length - 1].experiments;
      for (let i = 0; i < Math.min(first.length, last.length); i++) {
        console.log(`  ${first[i].name}: ${first[i].score} → ${last[i].score} (${last[i].score - first[i].score >= 0 ? "+" : ""}${last[i].score - first[i].score})`);
      }
    }
  }

  console.log(`\nHistory saved: ${HISTORY_FILE}`);
  console.log(`Prompt change logs: ${RESULTS_DIR}/prompt-changes-iter*.md`);
}

main().catch(err => {
  console.error("Loop failed:", err);
  process.exit(1);
});
