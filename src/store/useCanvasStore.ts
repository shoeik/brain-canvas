import { create } from "zustand";
import { temporal } from "zundo";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import type { BrainEdge, BrainNode, BrainNodeData, CanvasSettings, Space } from "../types";
import { createId } from "../lib/id";
import { firstParentId } from "../lib/mindmap";
import { DEFAULT_FONT_SIZE, DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from "../theme/theme";

const CHILD_GAP_X = 60;
const SIBLING_GAP_Y = 24;

/**
 * Working copy of the active space's graph. This is where editing happens and
 * where undo/redo (zundo `temporal`) is scoped. Changes here are mirrored back
 * into the persisted app store by a subscriber wired up in CanvasPage.
 */
interface CanvasState {
  spaceId: string | null;
  nodes: BrainNode[];
  edges: BrainEdge[];
  settings: CanvasSettings;

  /** Id of the node currently in inline-edit mode (ephemeral UI state). */
  editingId: string | null;
  setEditing: (id: string | null) => void;

  /** Load a space into the working copy. Temporal history is reset after. */
  loadSpace: (space: Space) => void;

  onNodesChange: (changes: NodeChange<BrainNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BrainEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (position: XYPosition, content?: string) => string;
  updateNodeContent: (id: string, content: string) => void;
  patchNodeData: (id: string, patch: Partial<BrainNodeData>) => void;
  deleteNodes: (ids: string[]) => void;

  addChild: (parentId: string) => string;
  addSibling: (nodeId: string) => string;
  outdent: (nodeId: string) => void;
  toggleCollapse: (id: string) => void;

  duplicateNodes: (ids: string[], offset?: XYPosition) => string[];
  /** Leave unselected copies behind (used for Option+Drag duplicate). */
  duplicateInPlace: (ids: string[]) => void;
  insertNodes: (nodes: BrainNode[], edges: BrainEdge[]) => void;

  setSettings: (patch: Partial<CanvasSettings>) => void;
  selectOnly: (ids: string[]) => void;
}

function makeNode(position: XYPosition, content = ""): BrainNode {
  return {
    id: createId(),
    type: "brain",
    position,
    // Explicit width/height let React Flow + NodeResizer own live sizing;
    // data mirrors them (persisted on resize end) so the export shape matches spec.
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    selected: true,
    data: {
      content,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
      fontSize: DEFAULT_FONT_SIZE,
    },
  };
}

/** Hydrate persisted nodes so React Flow gets explicit dimensions from data. */
function hydrateNodes(nodes: BrainNode[]): BrainNode[] {
  return nodes.map((n) => ({
    ...n,
    width: n.data.width ?? DEFAULT_NODE_WIDTH,
    height: n.data.height ?? DEFAULT_NODE_HEIGHT,
  }));
}

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set, get) => ({
      spaceId: null,
      nodes: [],
      edges: [],
      settings: { nodeStyle: "dark" },
      editingId: null,

      setEditing: (id) => set({ editingId: id }),

      loadSpace: (space) => {
        set({
          spaceId: space.id,
          nodes: hydrateNodes(space.nodes),
          edges: space.edges,
          settings: space.settings,
          editingId: null,
        });
      },

      onNodesChange: (changes) =>
        set((s) => {
          const dragged = changes
            .flatMap((change) => {
              if (change.type !== "position" || !change.position) return [];
              const before = s.nodes.find((n) => n.id === change.id);
              if (!before) return [];
              return {
                id: change.id,
                dx: change.position.x - before.position.x,
                dy: change.position.y - before.position.y,
              };
            })
            .filter((move): move is { id: string; dx: number; dy: number } => {
              return !!move && (move.dx !== 0 || move.dy !== 0);
            });

          const changedIds = new Set(changes.flatMap((change) => ("id" in change ? [change.id] : [])));
          const descendantDeltas = new Map<string, XYPosition>();

          for (const move of dragged) {
            for (const childId of descendantIds(s.edges, move.id)) {
              if (changedIds.has(childId)) continue;
              const current = descendantDeltas.get(childId) ?? { x: 0, y: 0 };
              descendantDeltas.set(childId, { x: current.x + move.dx, y: current.y + move.dy });
            }
          }

          const nextNodes = applyNodeChanges(changes, s.nodes);
          if (!descendantDeltas.size) return { nodes: nextNodes };

          return {
            nodes: nextNodes.map((node) => {
              const delta = descendantDeltas.get(node.id);
              if (!delta) return node;
              return {
                ...node,
                position: {
                  x: node.position.x + delta.x,
                  y: node.position.y + delta.y,
                },
              };
            }),
          };
        }),

      onEdgesChange: (changes) =>
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

      onConnect: (connection) =>
        set((s) => ({ edges: addEdge(connection, s.edges) })),

      addNode: (position, content = "") => {
        const node = makeNode(position, content);
        set((s) => ({
          nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), node],
          editingId: content ? null : node.id,
        }));
        return node.id;
      },

      updateNodeContent: (id, content) =>
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, content } } : n)),
        })),

      patchNodeData: (id, patch) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  width: patch.width ?? n.width,
                  height: patch.height ?? n.height,
                  data: { ...n.data, ...patch },
                }
              : n,
          ),
        })),

      deleteNodes: (ids) => {
        const remove = new Set(ids);
        set((s) => ({
          nodes: s.nodes.filter((n) => !remove.has(n.id)),
          edges: s.edges.filter((e) => !remove.has(e.source) && !remove.has(e.target)),
        }));
      },

      addChild: (parentId) => {
        const parent = get().nodes.find((n) => n.id === parentId);
        if (!parent) return "";
        const siblings = get().edges.filter((e) => e.source === parentId).length;
        const child = makeNode({
          x: parent.position.x + (parent.data.width ?? DEFAULT_NODE_WIDTH) + CHILD_GAP_X,
          y: parent.position.y + siblings * ((parent.data.height ?? DEFAULT_NODE_HEIGHT) + SIBLING_GAP_Y),
        });
        const edge: BrainEdge = { id: createId("e"), source: parentId, target: child.id };
        set((s) => ({
          nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), child],
          edges: [...s.edges, edge],
          editingId: child.id,
        }));
        return child.id;
      },

      addSibling: (nodeId) => {
        const parentId = firstParentId(get().edges, nodeId);
        if (parentId) return get().addChild(parentId);
        // No parent → create a free-floating sibling below the node.
        const node = get().nodes.find((n) => n.id === nodeId);
        if (!node) return "";
        const sib = makeNode({
          x: node.position.x,
          y: node.position.y + (node.data.height ?? DEFAULT_NODE_HEIGHT) + SIBLING_GAP_Y,
        });
        set((s) => ({
          nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), sib],
          editingId: sib.id,
        }));
        return sib.id;
      },

      outdent: (nodeId) => {
        const parentId = firstParentId(get().edges, nodeId);
        if (!parentId) return; // already a root
        const grandParentId = firstParentId(get().edges, parentId);
        set((s) => {
          // Drop the edge from the current parent.
          const edges = s.edges.filter((e) => !(e.source === parentId && e.target === nodeId));
          // Re-attach to grandparent if one exists; otherwise it becomes a root.
          if (grandParentId) {
            edges.push({ id: createId("e"), source: grandParentId, target: nodeId });
          }
          return { edges };
        });
      },

      toggleCollapse: (id) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n,
          ),
        })),

      duplicateNodes: (ids, offset = { x: 32, y: 32 }) => {
        const source = get().nodes.filter((n) => ids.includes(n.id));
        const idMap = new Map<string, string>();
        const clones: BrainNode[] = source.map((n) => {
          const newId = createId();
          idMap.set(n.id, newId);
          return {
            ...n,
            id: newId,
            selected: true,
            position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
            data: { ...n.data },
          };
        });
        // Preserve edges that live entirely within the duplicated selection.
        const clonedEdges: BrainEdge[] = get()
          .edges.filter((e) => idMap.has(e.source) && idMap.has(e.target))
          .map((e) => ({
            ...e,
            id: createId("e"),
            source: idMap.get(e.source)!,
            target: idMap.get(e.target)!,
          }));
        set((s) => ({
          nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...clones],
          edges: [...s.edges, ...clonedEdges],
        }));
        return clones.map((c) => c.id);
      },

      duplicateInPlace: (ids) => {
        const source = get().nodes.filter((n) => ids.includes(n.id));
        const idMap = new Map<string, string>();
        const clones: BrainNode[] = source.map((n) => {
          const newId = createId();
          idMap.set(n.id, newId);
          return { ...n, id: newId, selected: false, data: { ...n.data } };
        });
        const clonedEdges: BrainEdge[] = get()
          .edges.filter((e) => idMap.has(e.source) && idMap.has(e.target))
          .map((e) => ({ ...e, id: createId("e"), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));
        // Originals keep their selection so the in-progress drag continues on them.
        set((s) => ({ nodes: [...s.nodes, ...clones], edges: [...s.edges, ...clonedEdges] }));
      },

      insertNodes: (nodes, edges) =>
        set((s) => ({
          nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...nodes],
          edges: [...s.edges, ...edges],
        })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      selectOnly: (ids) => {
        const wanted = new Set(ids);
        set((s) => ({ nodes: s.nodes.map((n) => ({ ...n, selected: wanted.has(n.id) })) }));
      },
    }),
    {
      // Only graph data is undoable; settings/editing/spaceId changes are not.
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      // Skip history entries for changes that don't alter the graph's meaning
      // — most importantly selection-only changes, so clicking nodes doesn't
      // create undo steps.
      equality: (a, b) => nodesEqual(a.nodes, b.nodes) && a.edges === b.edges,
      // Leading-edge throttle: record the *pre-burst* state immediately and
      // coalesce a rapid burst (typing, dragging) into one history entry.
      // Recording immediately (vs debounce) means a change is undoable at once.
      handleSet: (handleSet) => throttleLeading(handleSet, 400),
      limit: 100,
    },
  ),
);

/** Reset undo history — call after loading a space so you can't undo into another. */
export function clearCanvasHistory() {
  useCanvasStore.temporal.getState().clear();
}

/** Equal if nodes match ignoring transient flags (selection, dragging). */
function nodesEqual(a: BrainNode[], b: BrainNode[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (x.id !== y.id) return false;
    if (x.position.x !== y.position.x || x.position.y !== y.position.y) return false;
    if (x.width !== y.width || x.height !== y.height) return false;
    if (x.data !== y.data) return false; // content/size/font/collapse all live in data
  }
  return true;
}

function descendantIds(edges: BrainEdge[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const edge of edges) {
    const children = childrenByParent.get(edge.source) ?? [];
    children.push(edge.target);
    childrenByParent.set(edge.source, children);
  }

  const result: string[] = [];
  const seen = new Set<string>([rootId]);
  const queue = [...(childrenByParent.get(rootId) ?? [])];

  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }

  return result;
}

function throttleLeading<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: never[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}
