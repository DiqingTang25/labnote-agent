/**
 * 图谱搜索组件 — 搜索节点并高亮定位
 */
import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import type { GraphNode } from "../lib/graph-types";

type Props = {
  nodes: GraphNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
};

export function GraphSearch({ nodes, selectedNodeId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          (n.sublabel && n.sublabel.toLowerCase().includes(q)) ||
          n.type.includes(q),
      )
      .slice(0, 8);
  }, [nodes, query]);

  const TYPE_ICONS: Record<string, string> = {
    experiment: "📋",
    sample: "🧪",
    device: "⚙️",
    operator: "👤",
    discipline: "📚",
    finding: "💡",
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) {
              onSelect(results[0].id);
              setQuery("");
              setOpen(false);
            }
            if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
            }
          }}
          placeholder="搜索节点…"
          className="border-0 shadow-none h-7 text-xs min-w-[140px] focus-visible:ring-0"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="shrink-0">
            <X size={12} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* 搜索结果 */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-border bg-background shadow-lg z-20 max-h-64 overflow-auto">
          {results.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                onSelect(n.id);
                setQuery("");
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2 ${
                selectedNodeId === n.id ? "bg-primary/10" : ""
              }`}
            >
              <span>{TYPE_ICONS[n.type] ?? "●"}</span>
              <span className="flex-1 truncate">{n.label}</span>
              <span className="text-[10px] text-muted-foreground">{n.degree ?? 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
