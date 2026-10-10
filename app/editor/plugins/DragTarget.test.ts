import {
  bulletList,
  createEditorState,
  createEditorStateWithSelection,
  doc,
  heading,
  hr,
  p,
  schema,
  table,
  td,
  tr,
} from "@shared/test/editor";
import { DragTarget } from "./DragTarget";

describe("DragTarget.resolvePos", () => {
  it("resolves a position in a top-level block to the block", () => {
    const state = createEditorState(doc([p("one"), heading("two")]));

    // Inside the heading text, which starts after the 5-size paragraph.
    expect(DragTarget.resolvePos(state, 7)).toEqual({ pos: 5, kind: "block" });
  });

  it("resolves a position in a list item to the list item", () => {
    const state = createEditorState(doc([bulletList(["one", "two"])]));
    const items: number[] = [];
    state.doc.descendants((node, pos) => {
      if (node.type.name === "list_item") {
        items.push(pos);
      }
    });
    expect(DragTarget.resolvePos(state, items[1] + 3)).toEqual({
      pos: items[1],
      kind: "listItem",
    });
  });

  it("resolves a position in a checkbox item to the checkbox item", () => {
    const list = schema.nodes.checkbox_list.create(null, [
      schema.nodes.checkbox_item.create(null, p("todo")),
    ]);
    const state = createEditorState(doc([list]));
    expect(DragTarget.resolvePos(state, 4)).toEqual({
      pos: 1,
      kind: "checkboxItem",
    });
  });

  it("returns null for an empty top-level paragraph", () => {
    const state = createEditorState(doc([p("one"), p("")]));
    expect(DragTarget.resolvePos(state, 6)).toBeNull();
  });

  it("returns null for a paragraph that holds a layout image", () => {
    const image = schema.nodes.image.create({
      src: "https://example.com/image.png",
      layoutClass: "full-width",
    });
    const state = createEditorState(
      doc([p("one"), schema.nodes.paragraph.create(null, image)])
    );
    expect(DragTarget.resolvePos(state, 6)).toBeNull();
  });

  it("resolves a position between top-level atoms to the adjacent atom", () => {
    const state = createEditorState(doc([p("one"), hr()]));
    expect(DragTarget.resolvePos(state, 5)).toEqual({ pos: 5, kind: "block" });
    expect(DragTarget.resolvePos(state, 6)).toEqual({ pos: 5, kind: "block" });
  });
});

describe("DragTarget#hasOwnControls", () => {
  const testDoc = doc([p("one"), table([tr([td("a"), td("b")])])]);

  // The table starts after the 5-size paragraph.
  const target = new DragTarget(5, document.createElement("div"), "block");

  it("returns true when the selection is inside the table", () => {
    const state = createEditorStateWithSelection(testDoc, 9);
    expect(target.hasOwnControls(state)).toBe(true);
  });

  it("returns false when the selection is outside the table", () => {
    const state = createEditorStateWithSelection(testDoc, 2);
    expect(target.hasOwnControls(state)).toBe(false);
  });

  it("returns false for a block that is not a table", () => {
    const state = createEditorStateWithSelection(testDoc, 2);
    const paragraph = new DragTarget(0, document.createElement("div"), "block");
    expect(paragraph.hasOwnControls(state)).toBe(false);
  });
});
