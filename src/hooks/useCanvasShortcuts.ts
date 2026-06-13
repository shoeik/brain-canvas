import { useEffect } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import type { BrainEdge, BrainNode } from "../types";
import { useCanvasStore } from "../store/useCanvasStore";

/** In-memory clipboard for node copy/paste (survives across spaces in a session). */
interface Clipboard {
  nodes: BrainNode[];
  edges: BrainEdge[];
}
let clipboard: Clipboard | null = null;

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Global canvas keyboard shortcuts (MindNode-style hierarchy ops + history +
 * copy/paste). Deletion is handled here (React Flow's own deleteKeyCode is
 * disabled) so connected edges are cleaned up via the store.
 */
export function useCanvasShortcuts(rf: ReactFlowInstance<BrainNode, BrainEdge> | null) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();
      // Never hijack typing in inputs or inline editors.
      if (store.editingId) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }

      const mod = isMac ? e.metaKey : e.ctrlKey;
      const selected = store.nodes.filter((n) => n.selected);
      const selectedIds = selected.map((n) => n.id);

      // --- History --------------------------------------------------------
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useCanvasStore.temporal.getState().redo();
        else useCanvasStore.temporal.getState().undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useCanvasStore.temporal.getState().redo();
        return;
      }

      // --- Copy (paste is handled via the DOM paste event) ----------------
      if (mod && e.key.toLowerCase() === "c") {
        if (!selected.length) return;
        const ids = new Set(selectedIds);
        clipboard = {
          nodes: selected.map((n) => ({ ...n, data: { ...n.data } })),
          edges: store.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
        };
        return;
      }

      // --- Mindmap hierarchy ---------------------------------------------
      if (e.key === "Tab") {
        if (selected.length !== 1) return;
        e.preventDefault();
        if (e.shiftKey) store.outdent(selectedIds[0]);
        else store.addChild(selectedIds[0]);
        return;
      }
      if (e.key === "Enter") {
        if (selected.length !== 1) return;
        e.preventDefault();
        store.addSibling(selectedIds[0]);
        return;
      }

      // --- Delete ---------------------------------------------------------
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedIds.length) return;
        e.preventDefault();
        store.deleteNodes(selectedIds);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rf]);
}

/** Read the current in-memory node clipboard (used by paste handling). */
export function getClipboard(): Clipboard | null {
  return clipboard;
}
