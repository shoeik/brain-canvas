import type { PersistedState, Space, Theme } from "../types";

const STORAGE_KEY = "brain-canvas:state:v1";
export const SCHEMA_VERSION = 1;

function emptyState(): PersistedState {
  return { version: SCHEMA_VERSION, theme: "dark", spaces: [] };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PersistedState;
    return migrate(parsed);
  } catch (err) {
    console.warn("Failed to load Brain Canvas state, starting fresh.", err);
    return emptyState();
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Most likely a quota error (e.g. large pasted images as data URLs).
    console.error("Failed to save Brain Canvas state.", err);
  }
}

/**
 * Forward-compatible migration hook. Today it just normalises the version, but
 * having it here means future schema changes have a single, obvious home.
 */
function migrate(state: PersistedState): PersistedState {
  if (!state || typeof state !== "object") return emptyState();
  return {
    version: SCHEMA_VERSION,
    theme: (state.theme as Theme) ?? "dark",
    spaces: Array.isArray(state.spaces) ? state.spaces : [],
  };
}

// --- JSON export / import ---------------------------------------------------

export function exportToJson(state: PersistedState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedJson(text: string): PersistedState {
  const parsed = JSON.parse(text) as PersistedState;
  const migrated = migrate(parsed);
  if (!Array.isArray(migrated.spaces)) {
    throw new Error("Invalid file: missing spaces array.");
  }
  return migrated;
}

/** Convenience used by the export button to trigger a download. */
export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type { Space };
