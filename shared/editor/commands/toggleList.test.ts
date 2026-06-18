import type { Node } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  createEditorStateWithSelection,
  doc,
  p,
  schema,
} from "@shared/test/editor";
import toggleList from "./toggleList";

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
function cli(content: Node[], checked = false) {
  return checkbox_item.create({ checked }, content);
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

  it("preserves nesting when converting a bullet list with a nested list to a checklist", () => {
    const testDoc = doc([
      bullet_list.create(null, [
        li([p("one")]),
        li([p("two"), bullet_list.create(null, [li([p("nested")])])]),
      ]),
    ]);

    const result = run(
      testDoc,
      "two",
      toggleList(checkbox_list, checkbox_item)
    );

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("checkbox_list");
    expect(outer?.childCount).toBe(2);
    expect(outer?.child(0).type.name).toBe("checkbox_item");
    expect(outer?.child(1).type.name).toBe("checkbox_item");

    const nested = outer?.child(1).child(1);
    expect(nested?.type.name).toBe("checkbox_list");
    expect(nested?.child(0).type.name).toBe("checkbox_item");
    expect(nested?.child(0).textContent).toBe("nested");
  });

  it("preserves nesting when converting a checklist with a nested checklist to a bullet list", () => {
    const testDoc = doc([
      checkbox_list.create(null, [
        cli([p("one")]),
        cli([p("two"), checkbox_list.create(null, [cli([p("nested")])])]),
      ]),
    ]);

    const result = run(testDoc, "two", toggleList(bullet_list, list_item));

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("bullet_list");
    expect(outer?.childCount).toBe(2);
    expect(outer?.child(0).type.name).toBe("list_item");
    expect(outer?.child(1).type.name).toBe("list_item");

    const nested = outer?.child(1).child(1);
    expect(nested?.type.name).toBe("bullet_list");
    expect(nested?.child(0).type.name).toBe("list_item");
    expect(nested?.child(0).textContent).toBe("nested");
  });

  it("converts a checklist nested in a bullet list without changing the parent list", () => {
    const testDoc = doc([
      bullet_list.create(null, [
        li([p("one")]),
        li([p("two"), checkbox_list.create(null, [cli([p("nested")])])]),
      ]),
    ]);

    const result = run(testDoc, "nested", toggleList(bullet_list, list_item));

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("bullet_list");
    expect(outer?.child(1).type.name).toBe("list_item");

    const nested = outer?.child(1).child(1);
    expect(nested?.type.name).toBe("bullet_list");
    expect(nested?.child(0).type.name).toBe("list_item");
    expect(nested?.child(0).textContent).toBe("nested");
  });

  it("converts a bullet list nested in a checklist to a checklist without changing the parent list", () => {
    const testDoc = doc([
      checkbox_list.create(null, [
        cli([p("one")]),
        cli([p("two"), bullet_list.create(null, [li([p("nested")])])]),
      ]),
    ]);

    const result = run(
      testDoc,
      "nested",
      toggleList(checkbox_list, checkbox_item)
    );

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("checkbox_list");
    expect(outer?.child(1).type.name).toBe("checkbox_item");

    const nested = outer?.child(1).child(1);
    expect(nested?.type.name).toBe("checkbox_list");
    expect(nested?.child(0).type.name).toBe("checkbox_item");
    expect(nested?.child(0).textContent).toBe("nested");
  });

  it("preserves the checked state of items already part of a nested checklist", () => {
    const testDoc = doc([
      bullet_list.create(null, [
        li([p("one"), checkbox_list.create(null, [cli([p("nested")], true)])]),
      ]),
    ]);

    const result = run(
      testDoc,
      "one",
      toggleList(checkbox_list, checkbox_item)
    );

    const outer = result.firstChild;
    expect(outer?.type.name).toBe("checkbox_list");
    expect(outer?.child(0).child(1).child(0).attrs.checked).toBe(true);
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
