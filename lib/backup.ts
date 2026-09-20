"use client";

import { LEVELS, STORAGE_KEY, isLevel, normalizeLevel, readProgress, writeProgress, type Level } from "./progress";
import { ATTEMPTS_KEY, readAttempts, writeAttempts, type Attempts } from "./attempts";

/**
 * Export and import for both browser-local stores.
 *
 * The original tracker only ever exported progress, so its file shape is kept
 * readable here: a v2 file carries attempts as well, and a v1 file (or a raw
 * dump of the old localStorage object) still imports.
 */

export const BACKUP_FORMAT = "principal-ai-tracker-progress-v2";
const LEGACY_FORMAT = "principal-ai-tracker-progress-v1";

export type Backup = {
  format: string;
  exportedAt: string;
  statuses: Record<string, Level>;
  attempts?: Attempts;
};

export function buildBackup(): Backup {
  return {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    statuses: readProgress(),
    attempts: readAttempts(),
  };
}

/** Triggers a download of the current stores. */
export function downloadBackup(filename = "code-learner-backup.json") {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ImportResult = {
  topics: number;
  problems: number;
};

export class ImportError extends Error {}

/**
 * Merges a backup into the current stores. Unknown topic ids and unknown
 * problem slugs are ignored rather than failing the whole import, so a file
 * from an older content set still restores what it can.
 */
export function applyBackup(
  raw: unknown,
  knownTopicIds: ReadonlySet<string>,
  knownSlugs: ReadonlySet<string>,
): ImportResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ImportError("Choose a JSON backup file.");
  }
  const parsed = raw as Partial<Backup> & Record<string, unknown>;
  if (parsed.format && parsed.format !== BACKUP_FORMAT && parsed.format !== LEGACY_FORMAT) {
    throw new ImportError("That file is not a Code-learner backup.");
  }

  // A v1 file nests progress under `statuses`; a raw localStorage dump is flat.
  const incoming = (parsed.statuses ?? parsed) as Record<string, unknown>;
  if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) {
    throw new ImportError("Choose a JSON backup file.");
  }

  const levels = Object.entries(incoming)
    .filter(([id, value]) => knownTopicIds.has(id) && (isLevel(value) || value === "mastered"))
    .map(([id, value]) => [id, normalizeLevel(value)] as const);

  const attempts = Object.entries((parsed.attempts ?? {}) as Record<string, unknown>)
    .filter(([slug, value]) =>
      knownSlugs.has(slug) && !!value && typeof value === "object" && !Array.isArray(value))
    .map(([slug, value]) => [slug, { ...(value as Attempts[string]), slug }] as const);

  if (levels.length === 0 && attempts.length === 0) {
    throw new ImportError("No matching topics or problems were found in that file.");
  }

  if (levels.length > 0) {
    const merged = { ...readProgress(), ...Object.fromEntries(levels) };
    if (!writeProgress(merged)) throw new ImportError("This browser could not save the import.");
  }
  if (attempts.length > 0) {
    const merged = { ...readAttempts(), ...Object.fromEntries(attempts) };
    if (!writeAttempts(merged)) throw new ImportError("This browser could not save the import.");
  }

  return { topics: levels.length, problems: attempts.length };
}

/** Reads and validates a picked file. */
export async function readBackupFile(file: File): Promise<unknown> {
  if (file.size > 5_000_000) throw new ImportError("That file is too large for a backup.");
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new ImportError("That file is not valid JSON.");
  }
}

export const STORAGE_KEYS = { progress: STORAGE_KEY, attempts: ATTEMPTS_KEY };
export { LEVELS };
