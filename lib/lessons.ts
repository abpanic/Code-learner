"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Which sub-topic lessons have been read, in this browser.
 *
 * Deliberately separate from the evidence ladder in lib/progress.ts. Reading a
 * lesson is not evidence of anything, and the seven-level ladder stays at topic
 * level: "what you can demonstrate" does not subdivide usefully across ~200
 * sub-topics (see plan.md, decision E1).
 */

export const LESSONS_KEY = "code_learner_lessons_v1";

/** `topicId/subtopicId` -> ISO timestamp of the first read. */
export type ReadLessons = Record<string, string>;

const EMPTY: ReadLessons = Object.freeze({});

export function lessonKey(topicId: string, subtopicId: string): string {
  return `${topicId}/${subtopicId}`;
}

function parse(raw: string | null): ReadLessons {
  if (!raw) return EMPTY;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return EMPTY;
    const entries = Object.entries(saved as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string") as [string, string][];
    return entries.length ? Object.fromEntries(entries) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let cachedRaw: string | null = null;
let cachedValue: ReadLessons = EMPTY;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(LESSONS_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): ReadLessons {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function getServerSnapshot(): ReadLessons {
  return EMPTY;
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === LESSONS_KEY) emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function readLessons(): ReadLessons {
  return getSnapshot();
}

export function writeLessons(next: ReadLessons): boolean {
  try {
    localStorage.setItem(LESSONS_KEY, JSON.stringify(next));
    emit();
    return true;
  } catch {
    return false;
  }
}

export function clearLessons(): boolean {
  try {
    localStorage.removeItem(LESSONS_KEY);
    emit();
    return true;
  } catch {
    return false;
  }
}

/** Records a first read; re-reading does not move the timestamp. */
export function markRead(topicId: string, subtopicId: string): boolean {
  const key = lessonKey(topicId, subtopicId);
  const current = getSnapshot();
  if (current[key]) return true;
  return writeLessons({ ...current, [key]: new Date().toISOString() });
}

export function markUnread(topicId: string, subtopicId: string): boolean {
  const current = getSnapshot();
  const key = lessonKey(topicId, subtopicId);
  if (!current[key]) return true;
  const next = { ...current };
  delete next[key];
  return writeLessons(next);
}

export function useReadLessons() {
  const read = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isRead = useCallback(
    (topicId: string, subtopicId: string) => !!read[lessonKey(topicId, subtopicId)],
    [read],
  );
  const countRead = useCallback(
    (topicId: string, subtopicIds: readonly string[]) =>
      subtopicIds.filter((id) => !!read[lessonKey(topicId, id)]).length,
    [read],
  );
  return { read, isRead, countRead };
}
