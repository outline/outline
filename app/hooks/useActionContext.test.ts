import { shallowEqual } from "./useActionContext";

describe("shallowEqual", () => {
  it("returns true for objects with the same keys and values", () => {
    const shared = () => {};
    expect(
      shallowEqual(
        { a: 1, b: "two", fn: shared },
        { a: 1, b: "two", fn: shared }
      )
    ).toBe(true);
  });

  it("returns true for two references to the same object", () => {
    const value = { a: 1 };
    expect(shallowEqual(value, value)).toBe(true);
  });

  it("returns false when a value differs", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false when a value is a new object with equal contents", () => {
    // Object.is, not deep equality: distinct references never compare equal.
    expect(shallowEqual({ nested: { x: 1 } }, { nested: { x: 1 } })).toBe(
      false
    );
  });

  it("returns false when the key sets differ in size", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("returns false when the key sets differ in content", () => {
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("returns true for two empty objects", () => {
    expect(shallowEqual({}, {})).toBe(true);
  });
});
