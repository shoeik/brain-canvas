import { create } from "zustand";
import type { BrainEdge, BrainNode, CanvasSettings, PersistedState, Space, Theme } from "../types";
import { createId } from "../lib/id";
import { loadState, saveState } from "../lib/storage";

/**
 * App-level store: the persisted source of truth for the whole document
 * (theme + all spaces, including their nodes/edges). Canvas edits flow back
 * into here via `commitCanvas`, and any change is mirrored to localStorage.
 *
 * Undo/redo is intentionally NOT here — it lives in the canvas store so it is
 * scoped to a single space's editing session.
 */
interface AppState {
  theme: Theme;
  spaces: Space[];

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  createSpace: (name: string) => Space;
  renameSpace: (id: string, name: string) => void;
  deleteSpace: (id: string) => void;
  getSpace: (id: string) => Space | undefined;

  /** Persist the working canvas (nodes/edges/settings) back into a space. */
  commitCanvas: (
    id: string,
    update: { nodes: BrainNode[]; edges: BrainEdge[]; settings: CanvasSettings },
  ) => void;

  /** Replace the entire document (used by JSON import). */
  replaceAll: (state: PersistedState) => void;
}

const initial = loadState();

export const useAppStore = create<AppState>((set, get) => ({
  theme: initial.theme,
  spaces: initial.spaces,

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

  createSpace: (name) => {
    const now = Date.now();
    const space: Space = {
      id: createId("space"),
      name: name.trim() || "Untitled",
      createdAt: now,
      updatedAt: now,
      nodes: [],
      edges: [],
      settings: { nodeStyle: "dark" },
    };
    set((s) => ({ spaces: [space, ...s.spaces] }));
    return space;
  },

  renameSpace: (id, name) =>
    set((s) => ({
      spaces: s.spaces.map((sp) =>
        sp.id === id ? { ...sp, name: name.trim() || sp.name, updatedAt: Date.now() } : sp,
      ),
    })),

  deleteSpace: (id) => set((s) => ({ spaces: s.spaces.filter((sp) => sp.id !== id) })),

  getSpace: (id) => get().spaces.find((sp) => sp.id === id),

  commitCanvas: (id, update) =>
    set((s) => ({
      spaces: s.spaces.map((sp) =>
        sp.id === id
          ? { ...sp, nodes: update.nodes, edges: update.edges, settings: update.settings, updatedAt: Date.now() }
          : sp,
      ),
    })),

  replaceAll: (state) => set({ theme: state.theme, spaces: state.spaces }),
}));

// Persist on change, debounced so that high-frequency edits (dragging,
// resizing) don't trigger a synchronous JSON.stringify of the whole document
// on every frame. A flush-on-hide guards against losing the last edit.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  const { theme, spaces } = useAppStore.getState();
  saveState({ version: 1, theme, spaces });
}
useAppStore.subscribe(() => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 300);
});
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearTimeout(saveTimer);
      persist();
    }
  });
}
