import type { Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { bulletList, doc, p, schema } from "@shared/test/editor";
import { pasteIntoListItem } from "./pasteIntoListItem";

const { checkbox_list, checkbox_item } = schema.nodes;

/**
 * Returns the position at the start of the first text node matching the text.
 *
 * @throws if no matching text node exists in the document.
 */
function posOfText(node: Node, text: string) {
  let found = -1;
  node.descendants((child, pos) => {
    if (found === -1 && child.isText && child.text === text) {
      found = pos;
    }
    return found === -1;
  });
  if (found === -1) {
    throw new Error(`Text "${text}" not found in document`);
  }
  return found;
}

/**
 * Copies the range from the start of one text node to the end of another, as
 * the editor does when the range is selected and copied.
 */
function copy(node: Node, fromText: string, toText: string) {
  return node.slice(
    posOfText(node, fromText),
    posOfText(node, toText) + toText.length,
    true
  );
}

/**
 * Pastes the slice over the given range and returns the resulting state, or
 * undefined if the paste was not handled.
 */
function paste(
  node: Node,
  pos: number,
  slice: ReturnType<typeof copy>,
  to = pos
) {
  const state = EditorState.create({
    doc: node,
    selection: TextSelection.create(node, pos, to),
  });
  let result: EditorState | undefined;
  pasteIntoListItem(slice)(state, (tr) => {
    result = state.apply(tr);
  });
  return result;
}

describe("pasteIntoListItem", () => {
  it("merges a copied item into the item at the cursor", () => {
    const before = doc(bulletList(["one", "two", "three"]));
    const pos = posOfText(before, "two");
    const after = paste(before, pos, copy(before, "three", "three"));

    expect(after?.doc.toJSON()).toEqual(
      doc(bulletList(["one", "threetwo", "three"])).toJSON()
    );
    expect(after?.selection.from).toEqual(pos + "three".length);
  });

  it("merges several copied items into the list", () => {
    const before = doc(bulletList(["one", "two", "three"]));
    const after = paste(
      before,
      posOfText(before, "two"),
      copy(before, "one", "two")
    );

    expect(after?.doc.toJSON()).toEqual(
      doc(bulletList(["one", "one", "twotwo", "three"])).toJSON()
    );
  });

  it("does not split the list when the copy ran past the end of it", () => {
    const before = doc([bulletList(["one", "two"]), p("three")]);
    const after = paste(
      before,
      posOfText(before, "one"),
      copy(before, "two", "three")
    );

    expect(after?.doc.toJSON()).toEqual(
      doc([bulletList(["two", "threeone", "two"]), p("three")]).toJSON()
    );
  });

  it("merges a copied checklist item into the item at the cursor", () => {
    const checklist = (items: string[]) =>
      doc(
        checkbox_list.create(
          null,
          items.map((text) => checkbox_item.create(null, p(text)))
        )
      );
    const before = checklist(["one", "two", "three"]);
    const after = paste(
      before,
      posOfText(before, "two"),
      copy(before, "three", "three")
    );

    expect(after?.doc.toJSON()).toEqual(
      checklist(["one", "threetwo", "three"]).toJSON()
    );
  });

  it("merges a copied item into the middle of the item at the cursor", () => {
    const before = doc(bulletList(["one", "two", "three"]));
    const after = paste(
      before,
      posOfText(before, "two") + 1,
      copy(before, "three", "three")
    );

    expect(after?.doc.toJSON()).toEqual(
      doc(bulletList(["one", "tthreewo", "three"])).toJSON()
    );
  });

  it("replaces a selection that spans list items", () => {
    const before = doc(bulletList(["one", "two", "three"]));
    const from = posOfText(before, "two") + 1;
    const after = paste(
      before,
      from,
      copy(before, "one", "one"),
      posOfText(before, "three") + 2
    );

    expect(after?.doc.toJSON()).toEqual(
      doc(bulletList(["one", "toneree"])).toJSON()
    );
    expect(after?.selection.empty).toBe(true);
    expect(after?.selection.from).toEqual(from + "one".length);
  });

  it("replaces a selection with several copied items", () => {
    const before = doc(bulletList(["one", "two", "three"]));
    const after = paste(
      before,
      posOfText(before, "two"),
      copy(before, "one", "two"),
      posOfText(before, "two") + "two".length
    );

    expect(after?.doc.toJSON()).toEqual(
      doc(bulletList(["one", "one", "two", "three"])).toJSON()
    );
  });

  it("does nothing outside of a list", () => {
    const before = doc([bulletList(["one"]), p("two")]);
    const slice = copy(before, "one", "one");

    expect(paste(before, posOfText(before, "two"), slice)).toBeUndefined();
  });
});
