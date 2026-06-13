import type { NodeStyle, Theme } from "../types";

/** Canvas (background) palette per app theme. */
export const canvasTheme: Record<Theme, { background: string; dots: string; chrome: string; text: string }> = {
  dark: {
    background: "#0f0f10",
    dots: "rgba(255,255,255,0.04)",
    chrome: "#1b1b1d",
    text: "#f5f5f5",
  },
  light: {
    background: "#fafafa",
    dots: "rgba(0,0,0,0.05)",
    chrome: "#ffffff",
    text: "#111111",
  },
};

/** Connection (edge) stroke per theme — thin and quiet. */
export const edgeStroke: Record<Theme, string> = {
  dark: "rgba(255,255,255,0.18)",
  light: "rgba(0,0,0,0.18)",
};

export interface NodeVisual {
  background: string;
  color: string;
  borderRadius: number;
}

/** Node appearance per selectable node style (independent of canvas theme). */
export const nodeVisuals: Record<NodeStyle, NodeVisual> = {
  dark: {
    background: "#242426",
    color: "#f5f5f5",
    borderRadius: 6,
  },
  light: {
    background: "#f5f5f5",
    color: "#111111",
    borderRadius: 8,
  },
  plain: {
    background: "transparent",
    color: "#f5f5f5",
    borderRadius: 0,
  },
};

export const DEFAULT_NODE_WIDTH = 140;
export const DEFAULT_NODE_HEIGHT = 42;
export const DEFAULT_FONT_SIZE = 19;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 48;
export const MIN_NODE_WIDTH = 96;
export const MIN_NODE_HEIGHT = 42;
export const MAX_AUTO_NODE_WIDTH = 420;
