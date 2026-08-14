/**
 * NIST Chemistry WebBook API Server Function
 *
 * 代理 NIST Chemistry WebBook REST API 调用。
 * NIST 提供化合物热力学数据（生成焓、熵、热容等）。
 *
 * API 文档: https://webbook.nist.gov/api/docs
 * 免费，无需认证，速率限制 ~1 req/s（建议客户端限流）。
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NIST_BASE = "https://webbook.nist.gov/api";

/** NIST 化合物查询结果 */
export interface NISTCompoundResult {
  name: string;
  formula: string;
  molecularWeight: number | null;
  enthalpyOfFormation: number | null; // kJ/mol, gas phase
  entropy: number | null; // J/mol·K, gas phase
  heatCapacity: number | null; // J/mol·K, gas phase
  boilingPoint: number | null; // K
  meltingPoint: number | null; // K
  casNumber: string | null;
}

/** Fetch with proxy support */
function nistFetch(url: string): Promise<Response> {
  return fetch(url, { headers: { Accept: "application/json" } });
}

/**
 * 按化学式搜索 NIST Chemistry WebBook
 */
export const searchNISTByFormula = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      formula: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const url = `${NIST_BASE}/cgi.cgi?formula=${encodeURIComponent(data.formula)}&format=JSON`;
    try {
      const res = await nistFetch(url);
      if (!res.ok) return { results: [] as NISTCompoundResult[] };
      const json = (await res.json()) as { result?: Array<Record<string, unknown>> };
      const results = (json.result ?? []).map(mapNISTEntry);
      return { results };
    } catch (err) {
      console.warn(`[NIST] Formula search failed for ${data.formula}:`, String(err).slice(0, 100));
      return { results: [] as NISTCompoundResult[] };
    }
  });

/**
 * 按名称搜索 NIST Chemistry WebBook
 */
export const searchNISTByName = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const url = `${NIST_BASE}/cgi.cgi?name=${encodeURIComponent(data.name)}&format=JSON`;
    try {
      const res = await nistFetch(url);
      if (!res.ok) return { results: [] as NISTCompoundResult[] };
      const json = (await res.json()) as { result?: Array<Record<string, unknown>> };
      const results = (json.result ?? []).map(mapNISTEntry);
      return { results };
    } catch (err) {
      console.warn(`[NIST] Name search failed for ${data.name}:`, String(err).slice(0, 100));
      return { results: [] as NISTCompoundResult[] };
    }
  });

/** 将 NIST API 响应映射为标准结构 */
function mapNISTEntry(entry: Record<string, unknown>): NISTCompoundResult {
  return {
    name: String(entry.name ?? entry.Name ?? ""),
    formula: String(entry.formula ?? entry.Formula ?? ""),
    molecularWeight: typeof entry.molWeight === "number" ? entry.molWeight :
      typeof entry.molecularWeight === "number" ? entry.molecularWeight : null,
    enthalpyOfFormation: typeof entry.enthalpyOfFormation === "number" ?
      entry.enthalpyOfFormation : null,
    entropy: typeof entry.entropy === "number" ? entry.entropy : null,
    heatCapacity: typeof entry.heatCapacity === "number" ? entry.heatCapacity :
      typeof entry.cp === "number" ? entry.cp : null,
    boilingPoint: typeof entry.boilingPoint === "number" ? entry.boilingPoint : null,
    meltingPoint: typeof entry.meltingPoint === "number" ? entry.meltingPoint : null,
    casNumber: typeof entry.cas === "string" ? entry.cas :
      typeof entry.casNumber === "string" ? entry.casNumber : null,
  };
}

/**
 * 批量查询 NIST — 同时按 formula 和 name 搜索
 * @returns 合并去重后的结果
 */
export const searchNIST = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      queries: z.array(z.object({
        type: z.enum(["formula", "name"]),
        value: z.string().min(1),
      })).max(10),
    }),
  )
  .handler(async ({ data }) => {
    const allResults: NISTCompoundResult[] = [];
    const seen = new Set<string>();

    for (const query of data.queries) {
      try {
        const url = query.type === "formula"
          ? `${NIST_BASE}/cgi.cgi?formula=${encodeURIComponent(query.value)}&format=JSON`
          : `${NIST_BASE}/cgi.cgi?name=${encodeURIComponent(query.value)}&format=JSON`;

        const res = await nistFetch(url);
        if (!res.ok) continue;

        const json = (await res.json()) as { result?: Array<Record<string, unknown>> };
        for (const entry of (json.result ?? [])) {
          const comp = mapNISTEntry(entry);
          const key = comp.formula || comp.name;
          if (key && !seen.has(key)) {
            seen.add(key);
            allResults.push(comp);
          }
        }

        // 限流：NIST API 建议 ~1 req/s
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.warn(`[NIST] Search failed for ${query.value}:`, String(err).slice(0, 100));
      }
    }

    return { results: allResults };
  });
