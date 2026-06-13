import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { useAppStore } from "../../store/useAppStore";
import { clearCanvasHistory, useCanvasStore } from "../../store/useCanvasStore";
import ThemeToggle from "../../components/ThemeToggle";
import BrainCanvas from "./BrainCanvas";
import SearchBox from "./components/SearchBox";
import Toolbar from "./components/Toolbar";
import CanvasSettings from "./components/CanvasSettings";

export default function CanvasPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const space = useAppStore((s) => s.spaces.find((sp) => sp.id === spaceId));
  const renameSpace = useAppStore((s) => s.renameSpace);
  const [editingTitle, setEditingTitle] = useState(false);

  // Load the space into the working canvas store whenever the id changes.
  useEffect(() => {
    if (!spaceId) return;
    const current = useAppStore.getState().spaces.find((sp) => sp.id === spaceId);
    if (!current) {
      navigate("/", { replace: true });
      return;
    }
    useCanvasStore.getState().loadSpace(current);
    clearCanvasHistory();
  }, [spaceId, navigate]);

  // Mirror canvas edits back into the persisted app store (which auto-saves).
  useEffect(() => {
    if (!spaceId) return;
    let prev = useCanvasStore.getState();
    return useCanvasStore.subscribe((state) => {
      if (state.spaceId !== spaceId) return;
      if (state.nodes === prev.nodes && state.edges === prev.edges && state.settings === prev.settings) {
        prev = state;
        return;
      }
      prev = state;
      useAppStore.getState().commitCanvas(spaceId, {
        nodes: state.nodes,
        edges: state.edges,
        settings: state.settings,
      });
    });
  }, [spaceId]);

  if (!space) return null;

  return (
    <ReactFlowProvider>
      <div className="canvas-page">
        <BrainCanvas />

        <div className="canvas-topbar">
          <button className="bc-btn" title="Spaces へ戻る" onClick={() => navigate("/")}>
            ←
          </button>

          {editingTitle ? (
            <input
              className="canvas-topbar__title"
              autoFocus
              defaultValue={space.name}
              onBlur={(e) => {
                renameSpace(space.id, e.target.value);
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              style={{ background: "var(--chrome-bg)", color: "var(--text-color)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "6px 10px" }}
            />
          ) : (
            <span
              className="canvas-topbar__title"
              onDoubleClick={() => setEditingTitle(true)}
              title="ダブルクリックで名前を変更"
            >
              {space.name}
            </span>
          )}

          <div className="canvas-topbar__spacer" />

          <SearchBox />
          <Toolbar />
          <CanvasSettings />
          <ThemeToggle />
        </div>

        <div className="hint-bar">
          ダブルクリック: ノード作成 / Tab: 子 / Enter: 兄弟 / Shift+Tab: 親変更 / Delete: 削除 / Cmd+Z: 取り消し
        </div>
      </div>
    </ReactFlowProvider>
  );
}
