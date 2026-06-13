import type { BrainEdge, BrainNode } from "../types";

/**
 * Mindmap hierarchy is derived from edges rather than stored on nodes.
 * An edge source -> target means "source is parent of target". This keeps
 * freeform connections and mindmap structure as one unified graph: any
 * connection participates in the hierarchy, and there is no separate parent
 * pointer to keep in sync.
 *
 * The graph is not guaranteed to be a tree (freeform allows cycles / multiple
 * parents), so traversals here are defensive: they track visited ids.
 */

export function childIds(edges: BrainEdge[], parentId: string): string[] {
  return edges.filter((e) => e.source === parentId).map((e) => e.target);
}

export function parentIds(edges: BrainEdge[], childId: string): string[] {
  return edges.filter((e) => e.target === childId).map((e) => e.source);
}

/** First parent, if any — used for sibling creation and outdenting. */
export function firstParentId(edges: BrainEdge[], childId: string): string | null {
  return parentIds(edges, childId)[0] ?? null;
}

/** All transitive descendants of a node (excluding the node itself). */
export function descendantIds(edges: BrainEdge[], rootId: string): Set<string> {
  const result = new Set<string>();
  const stack = [...childIds(edges, rootId)];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const child of childIds(edges, id)) stack.push(child);
  }
  return result;
}

/**
 * Resolve which nodes/edges should be hidden because an ancestor is collapsed.
 * A node is hidden if any collapsed node is one of its ancestors.
 */
export function computeHidden(nodes: BrainNode[], edges: BrainEdge[]) {
  const collapsedRoots = nodes.filter((n) => n.data.collapsed).map((n) => n.id);
  const hiddenNodes = new Set<string>();
  for (const root of collapsedRoots) {
    for (const id of descendantIds(edges, root)) hiddenNodes.add(id);
  }
  const hiddenEdges = new Set<string>();
  for (const e of edges) {
    if (hiddenNodes.has(e.source) || hiddenNodes.has(e.target)) {
      hiddenEdges.add(e.id);
    }
  }
  return { hiddenNodes, hiddenEdges };
}

/** True if a node has at least one child (used to show the collapse toggle). */
export function hasChildren(edges: BrainEdge[], nodeId: string): boolean {
  return edges.some((e) => e.source === nodeId);
}
