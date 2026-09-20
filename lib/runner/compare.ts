/**
 * Result comparison, kept on the main thread so one implementation serves both
 * the live runner and the build-time test that checks every reference solution.
 *
 * The worker only ever reports what the learner's code returned; deciding
 * whether that counts as correct happens here.
 */

export type Mismatch = { path: string; actual: string; expected: string } | null;

function near(a: number, b: number, tolerance: number): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= tolerance;
}

/**
 * Structural equality, with `tolerance` applied to every number encountered —
 * including numbers nested inside arrays and objects. Exact equality on floats
 * is a bug, not strictness, so a float problem must set a tolerance.
 */
export function matches(actual: unknown, expected: unknown, tolerance?: number): boolean {
  return findMismatch(actual, expected, tolerance) === null;
}

/** The first place the two values diverge, for a readable failure message. */
export function findMismatch(
  actual: unknown,
  expected: unknown,
  tolerance?: number,
  path = "",
): Mismatch {
  const fail = (): Mismatch => ({
    path,
    actual: formatValue(actual),
    expected: formatValue(expected),
  });

  if (typeof expected === "number" && typeof actual === "number") {
    if (tolerance !== undefined) return near(actual, expected, tolerance) ? null : fail();
    return Object.is(actual, expected) || actual === expected ? null : fail();
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return fail();
    if (actual.length !== expected.length) return fail();
    for (let i = 0; i < expected.length; i += 1) {
      const inner = findMismatch(actual[i], expected[i], tolerance, `${path}[${i}]`);
      if (inner) return inner;
    }
    return null;
  }

  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) return fail();
    const expectedEntries = Object.entries(expected as Record<string, unknown>);
    const actualKeys = Object.keys(actual as Record<string, unknown>);
    if (actualKeys.length !== expectedEntries.length) return fail();
    for (const [key, value] of expectedEntries) {
      if (!(key in (actual as Record<string, unknown>))) return fail();
      const inner = findMismatch(
        (actual as Record<string, unknown>)[key],
        value,
        tolerance,
        path ? `${path}.${key}` : key,
      );
      if (inner) return inner;
    }
    return null;
  }

  return actual === expected ? null : fail();
}

/** Compact, stable rendering for the results panel. */
export function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
