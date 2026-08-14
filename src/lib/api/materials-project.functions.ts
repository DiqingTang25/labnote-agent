/**
 * Materials Project API Server Function
 *
 * 代理 Materials Project REST API 调用，保护 MP_API_KEY 不暴露给浏览器。
 * 支持批量公式查询，一次请求查询多个材料。
 *
 * API 文档: https://api.materialsproject.org/docs
 * 获取 Key: https://materialsproject.org/dashboard
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "../config.server";

const MP_BASE = "https://api.materialsproject.org";

/** Fetch with optional HTTP proxy support */
function mpFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

/** 单个材料查询结果 */
export interface MPMaterialResult {
  materialId: string;
  formula: string;
  bandGap: number | null;
  formationEnergyPerAtom: number | null;
  energyAboveHull: number | null;
  crystalSystem: string | null;
  spacegroupSymbol: string | null;
  density: number | null;
  isStable: boolean;
  isMetal: boolean;
}

// Server function — 仅在服务端执行
export const searchMaterialsProject = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      formulas: z.array(z.string()).min(1).max(10),
    }),
  )
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const apiKey = config.mpApiKey;

    if (!apiKey) {
      console.warn("[MaterialsProject] MP_API_KEY not configured, returning empty results");
      return { results: [] as MPMaterialResult[] };
    }

    const headers = {
      "X-API-KEY": apiKey,
      "Accept": "application/json",
    };

    // 并行查询所有公式
    const results: MPMaterialResult[] = [];
    const errors: string[] = [];

    for (const formula of data.formulas) {
      try {
        const url = new URL(`${MP_BASE}/materials/summary/`);
        url.searchParams.set("formula", formula);
        url.searchParams.set(
          "_fields",
          "material_id,formula_pretty,band_gap,formation_energy_per_atom," +
          "energy_above_hull,crystal_system,spacegroup_symbol,density,is_stable,is_metal",
        );
        // 取前 3 个最稳定的结果
        url.searchParams.set("_limit", "3");
        url.searchParams.set("_sort_fields", "energy_above_hull");

        const res = await mpFetch(url.toString(), { headers });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          errors.push(`${formula}: HTTP ${res.status} ${errText.slice(0, 200)}`);
          continue;
        }

        const json = (await res.json()) as {
          data?: Array<Record<string, unknown>>;
        };

        const entries = json.data ?? [];
        for (const entry of entries) {
          results.push(mapMPEntry(entry));
        }
      } catch (err) {
        errors.push(`${formula}: ${String(err).slice(0, 200)}`);
      }
    }

    if (errors.length > 0) {
      console.warn("[MaterialsProject] query errors:", errors);
    }

    return { results };
  });

/** 将 MP API 响应条目映射为标准结构 */
function mapMPEntry(entry: Record<string, unknown>): MPMaterialResult {
  return {
    materialId: String(entry.material_id ?? ""),
    formula: String(entry.formula_pretty ?? ""),
    bandGap: typeof entry.band_gap === "number" ? entry.band_gap : null,
    formationEnergyPerAtom:
      typeof entry.formation_energy_per_atom === "number"
        ? entry.formation_energy_per_atom
        : null,
    energyAboveHull:
      typeof entry.energy_above_hull === "number"
        ? entry.energy_above_hull
        : null,
    crystalSystem:
      typeof entry.crystal_system === "string" ? entry.crystal_system : null,
    spacegroupSymbol:
      typeof entry.spacegroup_symbol === "string"
        ? entry.spacegroup_symbol
        : null,
    density: typeof entry.density === "number" ? entry.density : null,
    isStable: Boolean(entry.is_stable),
    isMetal: Boolean(entry.is_metal),
  };
}
