import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Handle, NodeResizer, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import type { BrainNode as BrainNodeType } from "../../../types";
import { useCanvasStore } from "../../../store/useCanvasStore";
import { hasChildren } from "../../../lib/mindmap";
import {
  MIN_FONT_SIZE,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  nodeVisuals,
} from "../../../theme/theme";
import NodeContent from "./NodeContent";

const NODE_PADDING_X = 24;
const NODE_PADDING_Y = 16;
const EMPTY_MEASURE_TEXT = "入力…";
const LINE_HEIGHT = 1.35;

/**
 * The single node type. It renders its content (read mode) or an inline editor
 * (edit mode, driven by the store's `editingId`), plus connection handles, a
 * resizer, and a collapse toggle when it has children.
 */
export default function BrainNode({ id, data, selected }: NodeProps<BrainNodeType>) {
  const editing = useCanvasStore((s) => s.editingId === id);
  const nodeStyle = useCanvasStore((s) => s.settings.nodeStyle);
  const isParent = useCanvasStore((s) => hasChildren(s.edges, id));
  const setEditing = useCanvasStore((s) => s.setEditing);
  const updateNodeContent = useCanvasStore((s) => s.updateNodeContent);
  const patchNodeData = useCanvasStore((s) => s.patchNodeData);
  const toggleCollapse = useCanvasStore((s) => s.toggleCollapse);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const editBaseSizeRef = useRef<{ width: number; height: number } | null>(null);
  const lastMeasuredContentRef = useRef<string | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const visual = nodeVisuals[nodeStyle];
  const fontSize = Math.max(MIN_FONT_SIZE, data.fontSize);

  const resizeToContent = useCallback(
    (content: string) => {
      if (!measureRef.current) return;

      const measure = measureRef.current;
      const text = content || EMPTY_MEASURE_TEXT;
      const lines = text.split("\n");
      const baseSize = editBaseSizeRef.current ?? {
        width: data.width ?? MIN_NODE_WIDTH,
        height: data.height ?? MIN_NODE_HEIGHT,
      };

      measure.style.fontSize = `${fontSize}px`;
      measure.style.display = "inline-block";
      measure.style.width = "max-content";
      measure.style.whiteSpace = "pre";
      measure.style.wordBreak = "normal";
      measure.style.overflowWrap = "normal";

      let widestLine = 0;
      for (const line of lines) {
        measure.textContent = line || " ";
        widestLine = Math.max(widestLine, Math.ceil(measure.getBoundingClientRect().width));
      }

      const nextWidth = Math.max(baseSize.width, MIN_NODE_WIDTH, Math.ceil(widestLine + NODE_PADDING_X));
      const nextHeight = Math.max(
        baseSize.height,
        MIN_NODE_HEIGHT,
        Math.ceil(lines.length * fontSize * LINE_HEIGHT + NODE_PADDING_Y),
      );
      const currentWidth = data.width ?? nextWidth;
      const currentHeight = data.height ?? nextHeight;

      if (Math.abs(currentWidth - nextWidth) > 1 || Math.abs(currentHeight - nextHeight) > 1) {
        patchNodeData(id, { width: nextWidth, height: nextHeight });
        updateNodeInternals(id);
      }
      lastMeasuredContentRef.current = content;
    },
    [data.height, data.width, fontSize, id, patchNodeData, updateNodeInternals],
  );

  useEffect(() => {
    if (editing && editorRef.current) {
      const el = editorRef.current;
      editBaseSizeRef.current = {
        width: data.width ?? MIN_NODE_WIDTH,
        height: data.height ?? MIN_NODE_HEIGHT,
      };
      lastMeasuredContentRef.current = data.content;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    if (!editing) {
      editBaseSizeRef.current = null;
      lastMeasuredContentRef.current = null;
    }
  }, [editing]);

  useLayoutEffect(() => {
    if (!editing || !measureRef.current) return;
    if (lastMeasuredContentRef.current === data.content) return;
    resizeToContent(data.content);
  }, [data.content, editing, resizeToContent]);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_WIDTH}
        minHeight={MIN_NODE_HEIGHT}
        lineStyle={{ borderColor: "var(--accent)" }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }}
        onResizeEnd={(_, params) => patchNodeData(id, { width: params.width, height: params.height })}
      />

      {/* Loose connection mode treats every handle as both source and target. */}
      <Handle type="source" position={Position.Top} id="t" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="t" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="b" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />

      <div
        className={`brain-node${selected ? " brain-node--selected" : ""}`}
        style={{
          background: visual.background,
          color: visual.color,
          borderRadius: visual.borderRadius,
          fontSize,
          cursor: editing ? "text" : "grab",
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(id);
        }}
      >
        {editing ? (
          <textarea
            ref={editorRef}
            className="brain-node__editor nodrag nopan"
            value={data.content}
            placeholder="入力…"
            wrap="off"
            onInput={(e) => resizeToContent(e.currentTarget.value)}
            onChange={(e) => {
              resizeToContent(e.target.value);
              updateNodeContent(id, e.target.value);
            }}
            onBlur={() => setEditing(null)}
            // Keep global canvas shortcuts (Tab/Enter/Delete/Cmd+…) from firing
            // while typing; only Escape is handled here to leave edit mode.
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(null);
              }
            }}
            onPaste={(e) => e.stopPropagation()}
          />
        ) : (
          <NodeContent content={data.content} />
        )}
        <div ref={measureRef} className="brain-node__measure" aria-hidden />
      </div>

      {isParent && (
        <button
          className="brain-node__collapse"
          title={data.collapsed ? "展開" : "折りたたみ"}
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse(id);
          }}
        >
          {data.collapsed ? "+" : "−"}
        </button>
      )}
    </>
  );
}
