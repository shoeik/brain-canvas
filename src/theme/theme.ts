import type { NodeStyle, Theme } from "../types";

/** Canvas (background) palette per app theme. */
export const canvasTheme: Record<Theme, { background: string; dots: string; chrome: string; text: string }> = {
  dark: {
    background: "#111111",
    dots: "rgba(255,255,255,0.03)",
    chrome: "#1b1b1b",
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
  dark: "rgba(255,255,255,0.15)",
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
    background: "#1e1e1e",
    color: "#f5f5f5",
    borderRadius: 8,
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

export const DEFAULT_NODE_WIDTH = 200;
export const DEFAULT_NODE_HEIGHT = 80;
export const DEFAULT_FONT_SIZE = 16;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 48;
