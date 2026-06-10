import type { Node } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  createEditorStateWithSelection,
  doc,
  p,
  schema,
} from "@shared/test/editor";
import toggleList from "./toggleList";

const { bullet_list, ordered_list, list_item } = schema.nodes;

/**
 * Creates a list item node with the given block content.
 */
function li(content: Node[]) {
  return list_item.create(null, content);
}

/**
 * Returns a position inside the first text node matching the given text.
 */
function posOfText(node: Node, text: string) {
  let found = -1;
  node.descendants((child, pos) => {
    if (found === -1 && child.isText && child.text === text) {
      found = pos;
    }
    return found === -1;
  });
  return found + 1;
}

/**
 * Runs a command with the selection placed inside the given text and returns
 * the resulting document.
 */
function run(testDoc: Node, selectionText: string, command: Command) {
  let state = createEditorStateWithSelection(
    testDoc,
    posOfText(testDoc, selectionText)
  );
  command(state, (tr) => {
    state = state.apply(tr);
  });
  return state.doc;
}

describe("toggleList", () => {
  it("converts a nested ordered list to bullet without changing the parent list", () => {
    const testDoc = doc([
      ordered_list.create(null, [
        li([p("one")]),
        li([p("two"), ordered_list.create(null, [li([p("nested")])])]),
      ]),
    ]);

    const result = run(testDoc, "nested", toggleList(bullet_list, list_item));

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("ordered_list");
    expect(outer?.child(1).child(1).type.name).toBe("bullet_list");
  });

  it("converts a nested bullet list to ordered without changing the parent list", () => {
    const testDoc = doc([
      bullet_list.create(null, [
        li([p("one")]),
        li([p("two"), bullet_list.create(null, [li([p("nested")])])]),
      ]),
    ]);

    const result = run(testDoc, "nested", toggleList(ordered_list, list_item));

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("bullet_list");
    expect(outer?.child(1).child(1).type.name).toBe("ordered_list");
  });

  it("converts the list and its children when the selection is in the parent list", () => {
    const testDoc = doc([
      ordered_list.create(null, [
        li([p("one")]),
        li([p("two"), ordered_list.create(null, [li([p("nested")])])]),
      ]),
    ]);

    const result = run(testDoc, "two", toggleList(bullet_list, list_item));

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("bullet_list");
    expect(outer?.child(1).child(1).type.name).toBe("bullet_list");
  });

  it("lifts the item out of the list when toggling the same list type", () => {
    const testDoc = doc([
      bullet_list.create(null, [li([p("one")]), li([p("two")])]),
    ]);

    const result = run(testDoc, "two", toggleList(bullet_list, list_item));

    expect(result.childCount).toBe(2);
    expect(result.child(0).type.name).toBe("bullet_list");
    expect(result.child(1).type.name).toBe("paragraph");
    expect(result.child(1).textContent).toBe("two");
  });
});
