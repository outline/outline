import { doc, p, schema } from "@shared/test/editor";
import { findBlockInsertPos } from "./findBlockInsertPos";

const { video, image } = schema.nodes;

describe("findBlockInsertPos", () => {
  // doc: <p>one</p><p></p><p>two</p>
  const document = doc([p("one"), p(""), p("two")]);

  it("returns the position before an empty paragraph", () => {
    expect(findBlockInsertPos(document, 6, video)).toBe(5);
  });

  it("returns the position before a paragraph when at its start", () => {
    expect(findBlockInsertPos(document, 1, video)).toBe(0);
  });

  it("returns the position after a paragraph when at its end", () => {
    expect(findBlockInsertPos(document, 4, video)).toBe(5);
  });

  it("returns the position before a paragraph when nearer its start", () => {
    expect(findBlockInsertPos(document, 2, video)).toBe(0);
  });

  it("returns the position after a paragraph when nearer its end", () => {
    expect(findBlockInsertPos(document, 3, video)).toBe(5);
  });

  it("returns a position between blocks unchanged", () => {
    expect(findBlockInsertPos(document, 7, video)).toBe(7);
  });

  it("returns the position unchanged for inline nodes", () => {
    expect(findBlockInsertPos(document, 2, image)).toBe(2);
  });
});
