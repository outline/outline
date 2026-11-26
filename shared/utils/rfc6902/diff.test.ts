import { applyPatch, createPatch } from "./index";
import { clone } from "./util";

describe("diffArrays", () => {
  it("returns the minimal patch for a small array change", () => {
    const input = ["a", "b", "c", "d"];
    const output = ["a", "x", "c", "d", "e"];
    const patch = createPatch(input, output);

    expect(patch).toEqual([
      { op: "replace", path: "/1", value: "x" },
      { op: "add", path: "/-", value: "e" },
    ]);

    const result = clone(input);
    applyPatch(result, patch);
    expect(result).toEqual(output);
  });

  it("throws quickly instead of building a huge memo", () => {
    const input = Array.from({ length: 3000 }, (_, i) => `before ${i}`);
    const output = Array.from({ length: 3000 }, (_, i) => `after ${i}`);
    const started = Date.now();

    expect(() => createPatch(input, output)).toThrow(/max complexity/);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("still diffs large arrays when the changed range is small", () => {
    const input = Array.from({ length: 3000 }, (_, i) => `item ${i}`);
    const output = [...input];
    output[1500] = "changed";

    expect(createPatch(input, output)).toEqual([
      { op: "replace", path: "/1500", value: "changed" },
    ]);
  });
});
