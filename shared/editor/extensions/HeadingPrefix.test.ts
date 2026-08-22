import type { Node as ProsemirrorNode } from "prosemirror-model";
import { Schema, Slice } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { HeadingPrefixStyle } from "../../types";
import HeadingPrefix, {
  HeadingPrefixHelper,
  headingPrefixPluginKey,
} from "./HeadingPrefix";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
    },
    table: { group: "block", content: "tr+" },
    tr: { content: "td+" },
    td: { content: "block+" },
    text: { group: "inline" },
  },
});

/** Builds a single-cell table that contains the given nodes. */
function tableOf(...content: ProsemirrorNode[]) {
  return schema.nodes.table.create(
    null,
    schema.nodes.tr.create(null, schema.nodes.td.create(null, content))
  );
}

/**
 * Builds an editor state containing a heading per given level, with the
 * heading prefix plugin configured for the given style.
 */
function stateFor(style: HeadingPrefixStyle, levels: number[]) {
  return EditorState.create({
    doc: schema.nodes.doc.create(
      null,
      levels.map((level) =>
        schema.nodes.heading.create({ level }, schema.text("Title"))
      )
    ),
    plugins: new HeadingPrefix({ headingPrefix: style }).plugins,
  });
}

/**
 * Reads the labels of the prefix decorations in the state, in document order.
 */
function labelsIn(state: EditorState) {
  return (
    headingPrefixPluginKey
      .getState(state)
      ?.decorations.find()
      .map((decoration) => decoration.spec.label) ?? []
  );
}

describe("HeadingPrefixHelper.labels", () => {
  it("labels each level in sequence", () => {
    expect(
      HeadingPrefixHelper.labels([1, 2, 2, 3, 2, 1], HeadingPrefixStyle.Numeric)
    ).toEqual(["1", "1.1", "1.2", "1.2.1", "1.3", "2"]);
  });

  it("starts at the first level in use", () => {
    expect(
      HeadingPrefixHelper.labels([3, 4, 2, 3], HeadingPrefixStyle.Alphanumeric)
    ).toEqual(["1", "1.a", "2", "2.a"]);
  });

  it("returns an empty list for no headings", () => {
    expect(HeadingPrefixHelper.labels([], HeadingPrefixStyle.Numeric)).toEqual(
      []
    );
  });

  it("shows only the current level for outline style in indented displays", () => {
    expect(
      HeadingPrefixHelper.labels([1, 2, 3, 2, 1], HeadingPrefixStyle.Outline, {
        indented: true,
      })
    ).toEqual(["I", "A", "1", "B", "II"]);
  });

  it("keeps concatenated labels for other styles in indented displays", () => {
    expect(
      HeadingPrefixHelper.labels([1, 2, 3], HeadingPrefixStyle.Numeric, {
        indented: true,
      })
    ).toEqual(["1", "1.1", "1.1.1"]);
  });
});

describe("HeadingPrefixHelper.labelsInRange", () => {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.heading.create({ level: 1 }, schema.text("One")),
    schema.nodes.paragraph.create(null, schema.text("Body")),
    schema.nodes.heading.create({ level: 2 }, schema.text("Two")),
    schema.nodes.heading.create({ level: 2 }, schema.text("Three")),
  ]);

  it("returns labels for every heading across the full document", () => {
    expect(
      HeadingPrefixHelper.labelsInRange(
        doc,
        HeadingPrefixStyle.Numeric,
        0,
        doc.content.size
      )
    ).toEqual(["1", "1.1", "1.2"]);
  });

  it("returns only labels of headings that intersect the range", () => {
    // The range covers the second heading only; the label still counts the
    // headings before it.
    const second = doc.child(0).nodeSize + doc.child(1).nodeSize;
    expect(
      HeadingPrefixHelper.labelsInRange(
        doc,
        HeadingPrefixStyle.Numeric,
        second + 1,
        second + 2
      )
    ).toEqual(["1.1"]);
  });

  it("includes headings that are partially selected", () => {
    // From inside the first heading to inside the paragraph.
    expect(
      HeadingPrefixHelper.labelsInRange(doc, HeadingPrefixStyle.Numeric, 2, 7)
    ).toEqual(["1"]);
  });

  it("ignores headings inside tables", () => {
    const withTable = schema.nodes.doc.create(null, [
      schema.nodes.heading.create({ level: 1 }, schema.text("One")),
      tableOf(schema.nodes.heading.create({ level: 2 }, schema.text("Cell"))),
      schema.nodes.heading.create({ level: 2 }, schema.text("Two")),
    ]);
    expect(
      HeadingPrefixHelper.labelsInRange(
        withTable,
        HeadingPrefixStyle.Numeric,
        0,
        withTable.content.size
      )
    ).toEqual(["1", "1.1"]);
  });
});

describe("HeadingPrefixHelper.injectIntoSlice", () => {
  it("prepends each label to the matching heading's text", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.heading.create({ level: 1 }, schema.text("One")),
      schema.nodes.paragraph.create(null, schema.text("Body")),
      schema.nodes.heading.create({ level: 2 }, schema.text("Two")),
    ]);
    const slice = new Slice(doc.content, 0, 0);

    const injected = HeadingPrefixHelper.injectIntoSlice(
      slice,
      ["1", "1.1"],
      schema
    );

    expect(injected.content.child(0).textContent).toBe("1 One");
    expect(injected.content.child(1).textContent).toBe("Body");
    expect(injected.content.child(2).textContent).toBe("1.1 Two");
    // The original slice is not modified.
    expect(slice.content.child(0).textContent).toBe("One");
  });

  it("does not label headings inside tables", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.heading.create({ level: 1 }, schema.text("One")),
      tableOf(schema.nodes.heading.create({ level: 2 }, schema.text("Cell"))),
      schema.nodes.heading.create({ level: 2 }, schema.text("Two")),
    ]);
    const slice = new Slice(doc.content, 0, 0);

    const injected = HeadingPrefixHelper.injectIntoSlice(
      slice,
      ["1", "1.1"],
      schema
    );

    expect(injected.content.child(0).textContent).toBe("1 One");
    expect(injected.content.child(1).textContent).toBe("Cell");
    expect(injected.content.child(2).textContent).toBe("1.1 Two");
  });
});

describe("HeadingPrefix", () => {
  it("numbers headings by their nesting", () => {
    const state = stateFor(HeadingPrefixStyle.Numeric, [1, 2, 2, 3, 2, 1]);
    expect(labelsIn(state)).toEqual(["1", "1.1", "1.2", "1.2.1", "1.3", "2"]);
  });

  it("starts numbering at the first level in use", () => {
    const state = stateFor(HeadingPrefixStyle.Numeric, [2, 3, 2]);
    expect(labelsIn(state)).toEqual(["1", "1.1", "2"]);
  });

  it("creates no decorations when the style is none", () => {
    const state = stateFor(HeadingPrefixStyle.None, [1, 2]);
    expect(labelsIn(state)).toEqual([]);
  });

  it("recomputes decorations when the style changes through metadata", () => {
    const state = stateFor(HeadingPrefixStyle.None, [1, 2]);
    const next = state.apply(
      state.tr.setMeta(headingPrefixPluginKey, HeadingPrefixStyle.Alphanumeric)
    );
    expect(labelsIn(next)).toEqual(["1", "1.a"]);

    const cleared = next.apply(
      next.tr.setMeta(headingPrefixPluginKey, HeadingPrefixStyle.None)
    );
    expect(labelsIn(cleared)).toEqual([]);
  });

  it("renumbers when a heading is added to the document", () => {
    const state = stateFor(HeadingPrefixStyle.Numeric, [1, 2]);
    const next = state.apply(
      state.tr.insert(
        0,
        schema.nodes.heading.create({ level: 1 }, schema.text("First"))
      )
    );
    expect(labelsIn(next)).toEqual(["1", "2", "2.1"]);
  });

  it("does not number headings inside tables", () => {
    const state = EditorState.create({
      doc: schema.nodes.doc.create(null, [
        schema.nodes.heading.create({ level: 1 }, schema.text("One")),
        tableOf(schema.nodes.heading.create({ level: 2 }, schema.text("Cell"))),
        schema.nodes.heading.create({ level: 2 }, schema.text("Two")),
      ]),
      plugins: new HeadingPrefix({ headingPrefix: HeadingPrefixStyle.Numeric })
        .plugins,
    });
    expect(labelsIn(state)).toEqual(["1", "1.1"]);
  });
});

describe("HeadingPrefixHelper.format", () => {
  it("formats numeric prefixes", () => {
    expect(HeadingPrefixHelper.format([1], HeadingPrefixStyle.Numeric)).toBe(
      "1"
    );
    expect(HeadingPrefixHelper.format([1, 2], HeadingPrefixStyle.Numeric)).toBe(
      "1.2"
    );
    expect(
      HeadingPrefixHelper.format([2, 1, 3], HeadingPrefixStyle.Numeric)
    ).toBe("2.1.3");
  });

  it("formats alphanumeric prefixes", () => {
    expect(
      HeadingPrefixHelper.format([1], HeadingPrefixStyle.Alphanumeric)
    ).toBe("1");
    expect(
      HeadingPrefixHelper.format([1, 2], HeadingPrefixStyle.Alphanumeric)
    ).toBe("1.b");
    expect(
      HeadingPrefixHelper.format([1, 2, 3], HeadingPrefixStyle.Alphanumeric)
    ).toBe("1.b.iii");
    expect(
      HeadingPrefixHelper.format([1, 2, 3, 4], HeadingPrefixStyle.Alphanumeric)
    ).toBe("1.b.iii.4");
  });

  it("formats outline prefixes", () => {
    expect(HeadingPrefixHelper.format([4], HeadingPrefixStyle.Outline)).toBe(
      "IV"
    );
    expect(HeadingPrefixHelper.format([4, 2], HeadingPrefixStyle.Outline)).toBe(
      "IV.B"
    );
    expect(
      HeadingPrefixHelper.format([4, 2, 3], HeadingPrefixStyle.Outline)
    ).toBe("IV.B.3");
    expect(
      HeadingPrefixHelper.format([4, 2, 3, 1, 9], HeadingPrefixStyle.Outline)
    ).toBe("IV.B.3.a.ix");
  });

  it("formats counters beyond a single letter or numeral", () => {
    expect(
      HeadingPrefixHelper.format([1, 27], HeadingPrefixStyle.Alphanumeric)
    ).toBe("1.aa");
    expect(
      HeadingPrefixHelper.format([1, 1, 14], HeadingPrefixStyle.Alphanumeric)
    ).toBe("1.a.xiv");
    expect(HeadingPrefixHelper.format([1949], HeadingPrefixStyle.Outline)).toBe(
      "MCMXLIX"
    );
  });
});
