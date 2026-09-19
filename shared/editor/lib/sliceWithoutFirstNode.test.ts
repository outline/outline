import { Fragment, Schema, Slice } from "prosemirror-model";
import { EditorState, Selection } from "prosemirror-state";
import { sliceWithoutFirstNode } from "./sliceWithoutFirstNode";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    horizontal_rule: { group: "block" },
    text: { group: "inline" },
  },
});

const paragraph = (text: string) =>
  schema.nodes.paragraph.create(null, text ? schema.text(text) : null);

describe("sliceWithoutFirstNode", () => {
  it("returns undefined for an empty slice", () => {
    expect(sliceWithoutFirstNode(Slice.empty)).toBeUndefined();
  });

  it("returns undefined when the slice holds a single node", () => {
    const slice = new Slice(Fragment.from(paragraph("one")), 1, 1);
    expect(sliceWithoutFirstNode(slice)).toBeUndefined();
  });

  it("removes the first node and keeps the open depths", () => {
    const slice = new Slice(
      Fragment.fromArray([paragraph("one"), paragraph("two")]),
      1,
      1
    );
    const result = sliceWithoutFirstNode(slice);

    expect(result?.content.childCount).toBe(1);
    expect(result?.content.firstChild?.textContent).toBe("two");
    expect(result?.openStart).toBe(1);
    expect(result?.openEnd).toBe(1);
  });

  it("clamps the open depths to leaf nodes", () => {
    const slice = new Slice(
      Fragment.fromArray([
        paragraph("one"),
        schema.nodes.horizontal_rule.create(),
      ]),
      1,
      1
    );
    const result = sliceWithoutFirstNode(slice);

    expect(result?.content.childCount).toBe(1);
    expect(result?.openStart).toBe(0);
    expect(result?.openEnd).toBe(0);
  });

  it("returns a slice that can replace a selection", () => {
    const slice = new Slice(
      Fragment.fromArray([paragraph("one"), paragraph("two")]),
      1,
      1
    );
    const state = EditorState.create({ schema });
    const tr = state.tr
      .setSelection(Selection.atStart(state.doc))
      .replaceSelection(sliceWithoutFirstNode(slice) ?? Slice.empty);

    expect(tr.doc.textContent).toBe("two");
  });
});
