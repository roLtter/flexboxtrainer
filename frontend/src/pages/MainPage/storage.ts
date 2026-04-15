import type { SavedState } from "./types";

const STORAGE_KEY = "layout_trainer_v1";

export function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

export function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
