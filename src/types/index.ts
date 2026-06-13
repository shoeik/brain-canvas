import type { Edge, Node } from "@xyflow/react";

/**
 * Core node payload. Kept intentionally minimal and "type-less": there is only
 * one kind of node. How a node *renders* (text / link / youtube / image) is
 * derived from `content` at render time (see lib/content.ts), not stored as a
 * discriminator. This keeps the data model stable while letting us add richer
 * rendering later without migrations.
 */
export interface BrainNodeData {
  content: string;
  width: number;
  height: number;
  fontSize: number;

  /** Mindmap collapse state: when true, descendants are hidden. */
  collapsed?: boolean;

  /**
   * Optional cached link metadata. Not populated in the MVP (no server / no
   * fetching), but the shape is reserved so a future "bookmark" enrichment
   * step can fill it in without changing the node contract.
   */
  meta?: LinkMeta;

  [key: string]: unknown;
}

export interface LinkMeta {
  title?: string;
  description?: string;
  image?: string;
}

/** A React Flow node specialised to our single node type. */
export type BrainNode = Node<BrainNodeData, "brain">;
export type BrainEdge = Edge;

/** How nodes look. Switchable from canvas settings, stored per space. */
export type NodeStyle = "dark" | "light" | "plain";

/** Global app theme (canvas background + chrome). */
export type Theme = "dark" | "light";

export interface CanvasSettings {
  nodeStyle: NodeStyle;
}

/** A single thinking space: its own canvas of nodes + edges. */
export interface Space {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: BrainNode[];
  edges: BrainEdge[];
  settings: CanvasSettings;
}

/** Shape persisted to localStorage / exported as JSON. */
export interface PersistedState {
  version: number;
  theme: Theme;
  spaces: Space[];
}
