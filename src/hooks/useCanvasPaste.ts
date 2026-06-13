import { useEffect } from "react";
import type { XYPosition } from "@xyflow/react";
import type { BrainEdge, BrainNode } from "../types";
import { useCanvasStore } from "../store/useCanvasStore";
import { getClipboard } from "./useCanvasShortcuts";
import { createId } from "../lib/id";

/**
 * Handles the DOM `paste` event on the canvas. Priority:
 *   1. an image file  -> image node (stored as a data URL, fully offline)
 *   2. internal node clipboard (Cmd+C) -> duplicate at the paste point
 *   3. text (URL or plain) -> a single node
 *
 * `getPosition` returns the flow-space point to drop new content at (cursor).
 */
export function useCanvasPaste(getPosition: () => XYPosition) {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const store = useCanvasStore.getState();
      if (store.editingId) return; // let the editor handle its own paste
      if (!store.spaceId || !e.clipboardData) return;

      // 1. Image file
      const imageItem = Array.from(e.clipboardData.items).find(
        (it) => it.kind === "file" && it.type.startsWith("image/"),
      );
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => store.addNode(getPosition(), String(reader.result));
          reader.readAsDataURL(file);
          return;
        }
      }

      // 2. Internal node clipboard
      const clip = getClipboard();
      const text = e.clipboardData.getData("text").trim();
      if (clip && clip.nodes.length && !text) {
        e.preventDefault();
        pasteClipboard(clip, getPosition());
        return;
      }

      // 3. Text / URL
      if (text) {
        e.preventDefault();
        store.addNode(getPosition(), text);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [getPosition]);
}

function pasteClipboard(clip: { nodes: BrainNode[]; edges: BrainEdge[] }, at: XYPosition) {
  const store = useCanvasStore.getState();
  // Anchor the cloned cluster's top-left at the paste position.
  const minX = Math.min(...clip.nodes.map((n) => n.position.x));
  const minY = Math.min(...clip.nodes.map((n) => n.position.y));
  const idMap = new Map<string, string>();

  const nodes: BrainNode[] = clip.nodes.map((n) => {
    const id = createId();
    idMap.set(n.id, id);
    return {
      ...n,
      id,
      selected: true,
      position: { x: at.x + (n.position.x - minX), y: at.y + (n.position.y - minY) },
      data: { ...n.data },
    };
  });
  const edges: BrainEdge[] = clip.edges.map((edge) => ({
    ...edge,
    id: createId("e"),
    source: idMap.get(edge.source)!,
    target: idMap.get(edge.target)!,
  }));
  store.insertNodes(nodes, edges);
}
