import { useReactFlow } from "@xyflow/react";
import type { BrainEdge, BrainNode } from "../../../types";
import { useCanvasStore } from "../../../store/useCanvasStore";
import { MAX_FONT_SIZE, MIN_FONT_SIZE } from "../../../theme/theme";

const FONT_STEP = 2;

/** History controls, fit-view, and font sizing for the selected node(s). */
export default function Toolbar() {
  const rf = useReactFlow<BrainNode, BrainEdge>();
  const selected = useCanvasStore((s) => s.nodes.filter((n) => n.selected));
  const patchNodeData = useCanvasStore((s) => s.patchNodeData);

  const undo = () => useCanvasStore.temporal.getState().undo();
  const redo = () => useCanvasStore.temporal.getState().redo();

  const changeFont = (delta: number) => {
    for (const n of selected) {
      const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, (n.data.fontSize ?? 16) + delta));
      patchNodeData(n.id, { fontSize: next });
    }
  };

  const fontDisabled = selected.length === 0;

  return (
    <>
      <div className="toolbar-group">
        <button className="bc-btn" title="元に戻す (Cmd+Z)" onClick={undo}>
          ↺
        </button>
        <button className="bc-btn" title="やり直す (Cmd+Shift+Z)" onClick={redo}>
          ↻
        </button>
        <button className="bc-btn" title="全体を表示" onClick={() => rf.fitView({ duration: 400, padding: 0.2 })}>
          ⤢
        </button>
      </div>

      <div className="toolbar-group">
        <button className="bc-btn" title="文字を小さく" disabled={fontDisabled} onClick={() => changeFont(-FONT_STEP)}>
          A−
        </button>
        <button className="bc-btn" title="文字を大きく" disabled={fontDisabled} onClick={() => changeFont(FONT_STEP)}>
          A+
        </button>
      </div>
    </>
  );
}
