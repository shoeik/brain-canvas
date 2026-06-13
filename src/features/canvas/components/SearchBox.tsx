import { useMemo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { BrainEdge, BrainNode } from "../../../types";
import { useCanvasStore } from "../../../store/useCanvasStore";

/** Search node content and focus (center + select) a match. */
export default function SearchBox() {
  const rf = useReactFlow<BrainNode, BrainEdge>();
  const nodes = useCanvasStore((s) => s.nodes);
  const selectOnly = useCanvasStore((s) => s.selectOnly);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter((n) => n.data.content.toLowerCase().includes(q)).slice(0, 30);
  }, [query, nodes]);

  const focusNode = (node: BrainNode) => {
    const w = node.data.width ?? 200;
    const h = node.data.height ?? 80;
    rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.2, duration: 400 });
    selectOnly([node.id]);
    setOpen(false);
  };

  return (
    <div className="search-box">
      <input
        value={query}
        placeholder="ノードを検索…"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) focusNode(results[0]);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((n) => (
            <button key={n.id} className="search-results__item" onMouseDown={() => focusNode(n)}>
              {n.data.content.trim() || "（空のノード）"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
