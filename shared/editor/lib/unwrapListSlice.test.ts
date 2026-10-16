import type { Node } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import {
  bulletList,
  createEditorState,
  doc,
  orderedList,
  p,
  schema,
} from "@shared/test/editor";
import { unwrapListSlice } from "./unwrapListSlice";

const { checkbox_list, checkbox_item } = schema.nodes;

/**
 * Creates a checkbox list node.
 */
function checkboxList(items: string[]) {
  return checkbox_list.create(
    null,
    items.map((text) => checkbox_item.create({ checked: false }, p(text)))
  );
}

/**
 * The slice parsed from the clipboard after copying text from list items, the
 * list and item are kept around the text as open context.
 */
function copied(list: Node, openStart = 3, openEnd = 3) {
  return new Slice(Fragment.from(list), openStart, openEnd);
}

/**
 * Returns the position of the start of the text block with the given text.
 *
 * @throws if no matching text block exists in the document.
 */
function posOfBlock(node: Node, text: string) {
  let found = -1;
  node.descendants((child, pos) => {
    if (found === -1 && child.isTextblock && child.textContent === text) {
      found = pos + 1;
    }
    return found === -1;
  });
  if (found === -1) {
    throw new Error(`No text block "${text}" in document`);
  }
  return found;
}

/**
 * Pastes the slice at the position, the way the editor pastes the clipboard.
 */
function paste(node: Node, pos: number, slice: Slice, unwrap = true) {
  const state = createEditorState(node);
  const tr = state.tr.setSelection(TextSelection.create(state.doc, pos));
  const { $from } = tr.selection;
  return tr.replaceSelection(
    unwrap ? unwrapListSlice(slice, $from, schema) : slice
  ).doc;
}

describe("unwrapListSlice", () => {
  const list = doc(bulletList(["one", "two", "three"]));

  it("adds an item's text at the start of another item without nesting", () => {
    const result = paste(
      list,
      posOfBlock(list, "two"),
      copied(bulletList(["three"]))
    );
    expect(result.eq(doc(bulletList(["one", "threetwo", "three"])))).toBe(true);
  });

  it("nests the list without it, the behavior this fixes", () => {
    const result = paste(
      list,
      posOfBlock(list, "two"),
      copied(bulletList(["three"])),
      false
    );
    expect(result.firstChild?.child(1).firstChild?.type.name).toBe(
      "bullet_list"
    );
  });

  it("adds several items to the list at the start of an item", () => {
    const result = paste(
      list,
      posOfBlock(list, "two"),
      copied(bulletList(["a", "b"]))
    );
    expect(result.eq(doc(bulletList(["one", "a", "btwo", "three"])))).toBe(
      true
    );
  });

  it("does not split the list when the copy ran past the end of it", () => {
    const result = paste(
      list,
      posOfBlock(list, "two") + 1,
      copied(bulletList(["three"]), 3, 0)
    );
    expect(result.eq(doc(bulletList(["one", "tthree", "wo", "three"])))).toBe(
      true
    );
  });

  it("pastes the same as before in the middle and at the end of an item", () => {
    const slice = copied(bulletList(["three"]));
    for (const pos of [
      posOfBlock(list, "two") + 1,
      posOfBlock(list, "two") + 3,
    ]) {
      expect(paste(list, pos, slice).eq(paste(list, pos, slice, false))).toBe(
        true
      );
    }
  });

  it("pastes the same as before into an empty item", () => {
    const withEmpty = doc(bulletList(["one", "two", ""]));
    const pos = posOfBlock(withEmpty, "");
    const slice = copied(bulletList(["three"]));
    expect(
      paste(withEmpty, pos, slice).eq(paste(withEmpty, pos, slice, false))
    ).toBe(true);
  });

  it("adds checklist items to a checklist without nesting", () => {
    const checklist = doc(checkboxList(["one", "two", "three"]));
    const result = paste(
      checklist,
      posOfBlock(checklist, "two"),
      copied(checkboxList(["three"]))
    );
    expect(result.eq(doc(checkboxList(["one", "threetwo", "three"])))).toBe(
      true
    );
  });

  it("keeps the slice when pasting into a different type of list", () => {
    const ordered = doc(orderedList(["one", "two"]));
    const $pos = ordered.resolve(posOfBlock(ordered, "two"));
    const slice = copied(bulletList(["three"]));
    expect(unwrapListSlice(slice, $pos, schema)).toBe(slice);
  });

  it("keeps the slice when pasting outside of a list", () => {
    const paragraph = doc(p("text"));
    const $pos = paragraph.resolve(posOfBlock(paragraph, "text"));
    const slice = copied(bulletList(["three"]));
    expect(unwrapListSlice(slice, $pos, schema)).toBe(slice);
  });

  it("keeps a slice that is not a list", () => {
    const $pos = list.resolve(posOfBlock(list, "two"));
    const slice = new Slice(Fragment.from(p("text")), 1, 1);
    expect(unwrapListSlice(slice, $pos, schema)).toBe(slice);
  });
});
