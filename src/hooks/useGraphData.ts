/**
 * 图谱数据 Hook — 整合实验 + Supabase 关系 → GraphData
 */
import { useState, useEffect, useMemo } from "react";
import { useLab } from "../lib/labStore";
import { isSupabaseReady, fetchAllRelations, type ExperimentRelation } from "../lib/supabase";
import { buildGraphData } from "../lib/graph-data";
import type { GraphData } from "../lib/graph-types";

export function useGraphData(): {
  graphData: GraphData;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const { experiments } = useLab();
  const [relations, setRelations] = useState<ExperimentRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  // 从 Supabase 拉取关系
  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAllRelations()
      .then((rels) => {
        setRelations(rels);
        setError(null);
      })
      .catch((err) => {
        console.error("[useGraphData] fetch error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
  }, [experiments.length, tick]);

  // 构建图谱数据
  const graphData = useMemo(
    () => buildGraphData(experiments, relations),
    [experiments, relations],
  );

  return {
    graphData,
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
