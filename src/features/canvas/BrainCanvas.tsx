import { useCallback, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";
import type { BrainEdge, BrainNode } from "../../types";
import { useCanvasStore } from "../../store/useCanvasStore";
import { useAppStore } from "../../store/useAppStore";
import { computeHidden } from "../../lib/mindmap";
import { canvasTheme, DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from "../../theme/theme";
import { useCanvasShortcuts } from "../../hooks/useCanvasShortcuts";
import { useCanvasPaste } from "../../hooks/useCanvasPaste";
import { nodeTypes } from "./nodes";

/**
 * The infinite canvas. Owns the React Flow instance and translates raw flow
 * interactions (double-click, connect, drag, paste) into store operations.
 * Must be rendered inside a ReactFlowProvider.
 */
export default function BrainCanvas() {
  const rf = useReactFlow<BrainNode, BrainEdge>();
  const theme = useAppStore((s) => s.theme);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const setEditing = useCanvasStore((s) => s.setEditing);
  const duplicateInPlace = useCanvasStore((s) => s.duplicateInPlace);

  // Last pointer position in screen space — used to drop pasted/created content.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const didAltDuplicate = useRef(false);

  // Collapse: hide descendants of any collapsed node.
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const { hiddenNodes, hiddenEdges } = computeHidden(nodes, edges);
    return {
      visibleNodes: nodes.map((n) => (hiddenNodes.has(n.id) ? { ...n, hidden: true } : n)),
      visibleEdges: edges.map((e) => (hiddenEdges.has(e.id) ? { ...e, hidden: true } : e)),
    };
  }, [nodes, edges]);

  const flowPositionAtPointer = useCallback((): XYPosition => {
    const p = pointer.current;
    if (p) return rf.screenToFlowPosition(p);
    // Fall back to the centre of the current viewport.
    return rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [rf]);

  useCanvasShortcuts(rf);
  useCanvasPaste(flowPositionAtPointer);

  // Double-click on empty canvas creates a node centred on the cursor.
  // Ignore double-clicks on nodes (they enter edit mode) and on chrome.
  const onWrapperDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__controls") ||
        target.closest(".react-flow__minimap") ||
        !target.closest(".react-flow")
      ) {
        return;
      }
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode({ x: pos.x - DEFAULT_NODE_WIDTH / 2, y: pos.y - DEFAULT_NODE_HEIGHT / 2 });
    },
    [rf, addNode],
  );

  return (
    <div
      style={{ width: "100%", height: "100%", background: canvasTheme[theme].background }}
      onMouseMove={(e) => (pointer.current = { x: e.clientX, y: e.clientY })}
      onDoubleClick={onWrapperDoubleClick}
    >
      <ReactFlow<BrainNode, BrainEdge>
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => setEditing(null)}
        onNodeDragStart={(e, node) => {
          if (e.altKey && !didAltDuplicate.current) {
            didAltDuplicate.current = true;
            const ids = nodes.filter((n) => n.selected).map((n) => n.id);
            duplicateInPlace(ids.length ? ids : [node.id]);
          }
        }}
        onNodeDragStop={() => (didAltDuplicate.current = false)}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        // Left-drag on empty canvas draws a selection box ("囲んで選択").
        selectionOnDrag
        // Pan with middle/right drag or Space+drag; wheel zooms to the cursor.
        panOnDrag={[1, 2]}
        zoomOnScroll
        zoomOnPinch
        selectionKeyCode={null}
        multiSelectionKeyCode={["Meta", "Shift"]}
        minZoom={0.1}
        maxZoom={4}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={canvasTheme[theme].dots} />
        <MiniMap
          pannable
          zoomable
          maskColor={theme === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)"}
          nodeColor={theme === "dark" ? "#555" : "#bbb"}
          style={{ background: canvasTheme[theme].chrome }}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
