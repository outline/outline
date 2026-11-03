import { isJSONEqual } from "./util";

describe("isJSONEqual", () => {
  it("should compare primitives", () => {
    expect(isJSONEqual("a", "a")).toBe(true);
    expect(isJSONEqual(1, 1)).toBe(true);
    expect(isJSONEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(isJSONEqual(null, null)).toBe(true);
    expect(isJSONEqual("1", 1)).toBe(false);
    expect(isJSONEqual(null, undefined)).toBe(false);
    expect(isJSONEqual(null, {})).toBe(false);
  });

  it("should compare arrays", () => {
    expect(isJSONEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(isJSONEqual([1, 2], [2, 1])).toBe(false);
    expect(isJSONEqual([1], [1, 2])).toBe(false);
    expect(isJSONEqual([], {})).toBe(false);
    expect(isJSONEqual({}, [])).toBe(false);
  });

  it("should compare objects regardless of key order", () => {
    expect(isJSONEqual({ a: 1, b: { c: [1] } }, { b: { c: [1] }, a: 1 })).toBe(
      true
    );
    expect(isJSONEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isJSONEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isJSONEqual({ a: undefined }, { b: undefined })).toBe(false);
  });

  it("should compare objects with a null prototype", () => {
    const attrs = (level: number) =>
      Object.assign(Object.create(null) as Record<string, unknown>, { level });

    expect(isJSONEqual(attrs(1), attrs(1))).toBe(true);
    expect(isJSONEqual(attrs(1), { level: 1 })).toBe(true);
    expect(isJSONEqual(attrs(1), attrs(2))).toBe(false);
  });
});
