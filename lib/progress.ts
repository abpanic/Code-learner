"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Single source of truth for the evidence ladder and the browser-local
 * progress store. Both the tracker and the per-lesson control read and write
 * the same `ml_transition_skills` key, so the shape lives here once.
 */
export const LEVELS = [
  "todo",
  "in_progress",
  "learned",
  "implemented",
  "production",
  "owned",
  "led",
] as const;

export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  todo: "To Do",
  in_progress: "In Progress (legacy)",
  learned: "Learned",
  implemented: "Implemented",
  production: "Production Applied",
  owned: "Designed / Owned",
  led: "Taught / Led",
};

export const LEVEL_OPTIONS = LEVELS.map(
  (level) => [level, LEVEL_LABELS[level]] as const,
);

/** The original single-file tracker's key. Kept so existing progress loads. */
export const STORAGE_KEY = "ml_transition_skills";

export type Progress = Record<string, Level>;

const EMPTY: Progress = Object.freeze({});

export function isLevel(value: unknown): value is Level {
  return LEVELS.includes(value as Level);
}

/** Legacy `mastered` entries from the original tracker map onto `learned`. */
export function normalizeLevel(value: unknown): Level {
  if (value === "mastered") return "learned";
  return isLevel(value) ? value : "todo";
}

/** todo/in_progress score 0; learned..led score 1..5. */
export function evidenceScore(level: Level): number {
  return Math.max(0, LEVELS.indexOf(level) - 1);
}

function parse(raw: string | null): Progress {
  if (!raw) return EMPTY;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return EMPTY;
    const entries = Object.entries(saved as Record<string, unknown>)
      .filter(([, value]) => isLevel(value) || value === "mastered")
      .map(([id, value]) => [id, normalizeLevel(value)] as const);
    return entries.length ? (Object.fromEntries(entries) as Progress) : EMPTY;
  } catch {
    return EMPTY;
  }
}

// useSyncExternalStore requires a stable snapshot: cache by the raw string so
// an unchanged store keeps returning the same object identity.
let cachedRaw: string | null = null;
let cachedValue: Progress = EMPTY;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): Progress {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function getServerSnapshot(): Progress {
  return EMPTY;
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === STORAGE_KEY) emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** Reads the store outside React (imports, exports, resets). */
export function readProgress(): Progress {
  return getSnapshot();
}

/** Returns false when this browser refuses to persist (private mode, quota). */
export function writeProgress(next: Progress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emit();
    return true;
  } catch {
    return false;
  }
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const level = useCallback(
    (topicId: string) => normalizeLevel(progress[topicId]),
    [progress],
  );
  const setLevel = useCallback(
    (topicId: string, next: Level) =>
      writeProgress({ ...getSnapshot(), [topicId]: next }),
    [],
  );
  return { progress, level, setLevel };
}

/**
 * False on the server and during hydration, true afterwards. Lets a component
 * hold back browser-only numbers until the markup has matched.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
