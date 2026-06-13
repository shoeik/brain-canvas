import type { NodeTypes } from "@xyflow/react";
import BrainNode from "./BrainNode";

/** Registered once and passed to ReactFlow. Defined outside render to keep a stable reference. */
export const nodeTypes: NodeTypes = {
  brain: BrainNode,
};
