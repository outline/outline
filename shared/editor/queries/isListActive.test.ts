import type { Node } from "prosemirror-model";
import {
  createEditorStateWithSelection,
  doc,
  p,
  schema,
} from "@shared/test/editor";
import { isListActive } from "./isListActive";

const { bullet_list, ordered_list, list_item, checkbox_list, checkbox_item } =
  schema.nodes;

/**
 * Creates a list item node with the given block content.
 */
function li(content: Node[]) {
  return list_item.create(null, content);
}

/**
 * Creates a checkbox item node with the given block content.
 */
function cli(content: Node[]) {
  return checkbox_item.create(null, content);
}

/**
 * Returns a position inside the first text node matching the given text.
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
  return found + 1;
}

/**
 * Builds an editor state with the selection placed inside the given text.
 */
function stateAt(testDoc: Node, selectionText: string) {
  return createEditorStateWithSelection(
    testDoc,
    posOfText(testDoc, selectionText)
  );
}

describe("isListActive", () => {
  it("matches the closest list type", () => {
    const testDoc = doc([
      bullet_list.create(null, [li([p("one")]), li([p("two")])]),
    ]);
    const state = stateAt(testDoc, "one");

    expect(isListActive(bullet_list)(state)).toBe(true);
    expect(isListActive(ordered_list)(state)).toBe(false);
    expect(isListActive(checkbox_list)(state)).toBe(false);
  });

  it("does not mark an ancestor list of a different type as active", () => {
    // An ordered list nested inside a checkbox list, selection in the
    // ordered list item.
    const testDoc = doc([
      checkbox_list.create(null, [
        cli([
          p("moo"),
          ordered_list.create(null, [li([p("dfsdf")]), li([p("sd")])]),
        ]),
      ]),
    ]);
    const state = stateAt(testDoc, "dfsdf");

    expect(isListActive(ordered_list)(state)).toBe(true);
    expect(isListActive(checkbox_list)(state)).toBe(false);
    expect(isListActive(bullet_list)(state)).toBe(false);
  });

  it("matches the parent list when the selection is in the parent item", () => {
    const testDoc = doc([
      checkbox_list.create(null, [
        cli([p("moo"), ordered_list.create(null, [li([p("dfsdf")])])]),
      ]),
    ]);
    const state = stateAt(testDoc, "moo");

    expect(isListActive(checkbox_list)(state)).toBe(true);
    expect(isListActive(ordered_list)(state)).toBe(false);
  });

  it("returns false when the selection is not in a list", () => {
    const testDoc = doc([p("hello")]);
    const state = stateAt(testDoc, "hello");

    expect(isListActive(bullet_list)(state)).toBe(false);
    expect(isListActive(ordered_list)(state)).toBe(false);
    expect(isListActive(checkbox_list)(state)).toBe(false);
  });
});
