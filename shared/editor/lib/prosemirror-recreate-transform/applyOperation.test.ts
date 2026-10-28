import { applyPatch } from "@shared/utils/rfc6902";
import { clone } from "@shared/utils/rfc6902/util";
import { applyOperation } from "./applyOperation";
import type { JSONObject } from "./types";

const doc = (): JSONObject => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { id: "a" },
      content: [{ type: "text", text: "first" }],
    },
    {
      type: "paragraph",
      attrs: { id: "b" },
      content: [{ type: "text", text: "second" }],
    },
  ],
});

describe("applyOperation", () => {
  it.each([
    { op: "replace", path: "/content/0/content/0/text", value: "changed" },
    { op: "replace", path: "/content/1/attrs/id", value: "c" },
    { op: "add", path: "/content/1", value: { type: "paragraph" } },
    { op: "add", path: "/content/-", value: { type: "paragraph" } },
    { op: "remove", path: "/content/0" },
    { op: "move", from: "/content/0", path: "/content/1" },
  ] as const)("should match applyPatch for $op $path", (operation) => {
    const original = doc();
    const expected = clone(original);
    applyPatch(expected, [operation]);

    const result = applyOperation(original, operation);

    expect(result).toEqual(expected);
    expect(original).toEqual(doc());
  });

  it("should share the values that are not on the path", () => {
    const original = doc();

    const result = applyOperation(original, {
      op: "replace",
      path: "/content/0/content/0/text",
      value: "changed",
    });

    const [first, second] = result.content as JSONObject[];
    const [originalFirst, originalSecond] = original.content as JSONObject[];
    expect(first).not.toBe(originalFirst);
    expect(first.attrs).toBe(originalFirst.attrs);
    expect(second).toBe(originalSecond);
  });
});
