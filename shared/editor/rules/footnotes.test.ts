import type { JSONNode } from "../../test/editor";
import { findNodes, parser } from "../../test/editor";

const parseToJSON = (markdown: string): JSONNode | undefined =>
  parser.parse(markdown)?.toJSON();

describe("footnote markdown rules", () => {
  it("parses a reference and its definition", () => {
    const doc = parseToJSON("Hello[^1] world\n\n[^1]: The note.");

    const refs = findNodes(doc, "footnote_reference");
    expect(refs).toHaveLength(1);
    expect(refs[0].attrs?.label).toBe("1");

    const lists = findNodes(doc, "footnotes");
    expect(lists).toHaveLength(1);
    expect(doc?.content?.at(-1)?.type).toBe("footnotes");

    const notes = findNodes(doc, "footnote");
    expect(notes).toHaveLength(1);
    expect(notes[0].attrs?.label).toBe("1");
    expect(notes[0].content?.[0].content?.[0].text).toBe("The note.");
  });

  it("parses text labels", () => {
    const doc = parseToJSON("Hello[^note] world\n\n[^note]: The note.");

    expect(findNodes(doc, "footnote_reference")[0].attrs?.label).toBe("note");
    expect(findNodes(doc, "footnote")[0].attrs?.label).toBe("note");
  });

  it("parses multi-paragraph definitions", () => {
    const doc = parseToJSON(
      "Hello[^1]\n\n[^1]: First paragraph.\n\n    Second paragraph."
    );

    const notes = findNodes(doc, "footnote");
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toHaveLength(2);
    expect(notes[0].content?.[1].content?.[0].text).toBe("Second paragraph.");
  });

  it("parses inline footnotes", () => {
    const doc = parseToJSON("Hello^[An inline note] world");

    expect(findNodes(doc, "footnote_reference")[0].attrs?.label).toBe("1");
    const notes = findNodes(doc, "footnote");
    expect(notes[0].attrs?.label).toBe("1");
    expect(notes[0].content?.[0].content?.[0].text).toBe("An inline note");
  });

  it("does not strip back-reference anchors into the document", () => {
    const doc = parseToJSON("Hello[^1]\n\n[^1]: The note.");

    expect(findNodes(doc, "footnote_anchor")).toHaveLength(0);
  });

  it("leaves a reference without a definition as text", () => {
    const doc = parseToJSON("Hello[^1] world");

    expect(findNodes(doc, "footnote_reference")).toHaveLength(0);
    expect(findNodes(doc, "footnotes")).toHaveLength(0);
    expect(doc?.content?.[0].content?.[0].text).toBe("Hello[^1] world");
  });
});
