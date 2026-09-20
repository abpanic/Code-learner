import { describe, expect, it } from "vitest";
import { findMismatch, formatValue, matches } from "./compare";

describe("matches", () => {
  it("compares primitives exactly without a tolerance", () => {
    expect(matches(1, 1)).toBe(true);
    expect(matches(1, 2)).toBe(false);
    expect(matches("a", "a")).toBe(true);
    expect(matches(true, false)).toBe(false);
    expect(matches(null, null)).toBe(true);
  });

  it("rejects a float that is merely close when no tolerance is set", () => {
    expect(matches(0.1 + 0.2, 0.3)).toBe(false);
  });

  it("accepts it within tolerance", () => {
    expect(matches(0.1 + 0.2, 0.3, 1e-9)).toBe(true);
    expect(matches(0.3001, 0.3, 1e-9)).toBe(false);
  });

  it("applies tolerance to numbers nested in arrays", () => {
    expect(matches([0.1 + 0.2, 1], [0.3, 1], 1e-9)).toBe(true);
    expect(matches([0.3, 1], [0.3, 2], 1e-9)).toBe(false);
  });

  it("compares arrays structurally", () => {
    expect(matches([1, 2], [1, 2])).toBe(true);
    expect(matches([1, 2], [2, 1])).toBe(false);
    expect(matches([1], [1, 2])).toBe(false);
    expect(matches([], [])).toBe(true);
  });

  it("does not treat an object as an array", () => {
    expect(matches({ 0: 1 }, [1])).toBe(false);
    expect(matches([1], { 0: 1 })).toBe(false);
  });

  it("compares nested structures", () => {
    expect(matches({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(matches({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
  });

  it("requires the same key count", () => {
    expect(matches({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(matches({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("treats NaN as equal to NaN only under a tolerance", () => {
    expect(matches(NaN, NaN, 1e-9)).toBe(true);
    expect(matches(Infinity, Infinity, 1e-9)).toBe(true);
    expect(matches(Infinity, 1, 1e-9)).toBe(false);
  });

  it("fails a missing return rather than passing it", () => {
    expect(matches(undefined, 0, 1e-9)).toBe(false);
    expect(matches(null, 0, 1e-9)).toBe(false);
  });
});

describe("findMismatch", () => {
  it("reports the path of the first divergence", () => {
    expect(findMismatch([1, 2, 3], [1, 2, 4])?.path).toBe("[2]");
    expect(findMismatch({ a: { b: 1 } }, { a: { b: 2 } })?.path).toBe("a.b");
    expect(findMismatch(1, 2)?.path).toBe("");
  });

  it("renders both sides for the message", () => {
    const mismatch = findMismatch([1, 1], [1]);
    expect(mismatch?.actual).toBe("[1,1]");
    expect(mismatch?.expected).toBe("[1]");
  });

  it("returns null when the values agree", () => {
    expect(findMismatch([1, 2], [1, 2])).toBeNull();
  });
});

describe("formatValue", () => {
  it("renders values compactly", () => {
    expect(formatValue([1, 2])).toBe("[1,2]");
    expect(formatValue("x")).toBe('"x"');
    expect(formatValue(null)).toBe("null");
    expect(formatValue(undefined)).toBe("undefined");
  });

  it("renders non-finite numbers readably", () => {
    expect(formatValue(NaN)).toBe("NaN");
    expect(formatValue(Infinity)).toBe("Infinity");
  });
});
