import type { InputRule } from "prosemirror-inputrules";
import type { Node } from "prosemirror-model";
import {
  createEditorStateWithSelection,
  doc,
  p,
  schema,
} from "@shared/test/editor";
import { checkboxListInputRule } from "./listInputRule";

const { bullet_list, ordered_list, list_item, checkbox_list, checkbox_item } =
  schema.nodes;

/**
 * Creates a list item node with the given block content.
 */
function li(content: Node[]) {
  return list_item.create(null, content);
}

/**
 * Returns the position directly after the first occurrence of the given text.
 *
 * @throws if no matching text node exists in the document.
 */
function posAfterText(node: Node, text: string) {
  let found = -1;
  node.descendants((child, pos) => {
    if (found === -1 && child.isText && child.text?.startsWith(text)) {
      found = pos;
    }
    return found === -1;
  });
  if (found === -1) {
    throw new Error(`Text "${text}" not found in document`);
  }
  return found + text.length;
}

/**
 * Simulates typing the trigger character of an input rule, mirroring the way
 * prosemirror-inputrules invokes a rule's handler, and returns the resulting
 * editor state (unchanged when the rule does not fire).
 */
function typeTrigger(
  rule: InputRule,
  testDoc: Node,
  markerInDoc: string,
  triggerChar: string
) {
  let state = createEditorStateWithSelection(
    testDoc,
    posAfterText(testDoc, markerInDoc)
  );
  const { from, to } = state.selection;
  const $from = state.doc.resolve(from);
  const textBefore =
    $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 500),
      $from.parentOffset,
      null,
      "￼"
    ) + triggerChar;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = (rule as any).match.exec(textBefore) as RegExpMatchArray | null;
  if (!match) {
    return state;
  }
  const startPos = from - (match[0].length - triggerChar.length);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tr = (rule as any).handler(state, match, startPos, to);
  if (tr) {
    state = state.apply(tr);
  }
  return state;
}

const rule = checkboxListInputRule(
  /^-?\s*(\[\s?\])\s$/i,
  checkbox_list,
  checkbox_item
);

describe("checkboxListInputRule", () => {
  it("converts a plain bullet list to a checklist", () => {
    const testDoc = doc([
      bullet_list.create(null, [li([p("[ ]")]), li([p("two")])]),
    ]);

    const result = typeTrigger(rule, testDoc, "[ ]", " ");

    const list = result.doc.firstChild;
    expect(list?.type.name).toBe("checkbox_list");
    expect(list?.childCount).toBe(2);
    expect(list?.child(0).type.name).toBe("checkbox_item");
    expect(list?.child(0).textContent).toBe("");
    expect(list?.child(1).textContent).toBe("two");
  });

  it("places the cursor at the start of the converted item", () => {
    const testDoc = doc([
      bullet_list.create(null, [li([p("[ ]")]), li([p("two")])]),
    ]);

    const result = typeTrigger(rule, testDoc, "[ ]", " ");

    // The selection should sit empty at the start of the first item's content.
    const { selection } = result;
    expect(selection.empty).toBe(true);
    const $from = result.doc.resolve(selection.from);
    expect($from.parent.type.name).toBe("paragraph");
    expect($from.parentOffset).toBe(0);
    expect($from.node(-1).type.name).toBe("checkbox_item");
  });

  it("converts a plain ordered list to a checklist", () => {
    const testDoc = doc([
      ordered_list.create(null, [li([p("[ ]")]), li([p("two")])]),
    ]);

    const result = typeTrigger(rule, testDoc, "[ ]", " ");

    expect(result.doc.firstChild?.type.name).toBe("checkbox_list");
  });

  it("preserves nesting when converting a list with a nested list", () => {
    const testDoc = doc([
      bullet_list.create(null, [
        li([p("[ ]")]),
        li([p("two"), bullet_list.create(null, [li([p("nested")])])]),
      ]),
    ]);

    const result = typeTrigger(rule, testDoc, "[ ]", " ");

    const list = result.doc.firstChild;
    expect(list?.type.name).toBe("checkbox_list");
    const nested = list?.child(1).child(1);
    expect(nested?.type.name).toBe("checkbox_list");
    expect(nested?.child(0).type.name).toBe("checkbox_item");
    expect(nested?.child(0).textContent).toBe("nested");
  });

  it("does nothing when already in a checklist", () => {
    const testDoc = doc([
      checkbox_list.create(null, [
        checkbox_item.create(null, p("[ ]")),
        checkbox_item.create(null, p("two")),
      ]),
    ]);

    const result = typeTrigger(rule, testDoc, "[ ]", " ");

    // The rule should not fire; the marker text is left untouched.
    expect(result.doc.firstChild?.type.name).toBe("checkbox_list");
    expect(result.doc.firstChild?.child(0).textContent).toBe("[ ]");
  });

  it("does nothing when not inside a list", () => {
    const testDoc = doc([p("[ ]")]);

    const result = typeTrigger(rule, testDoc, "[ ]", " ");

    expect(result.doc.firstChild?.type.name).toBe("paragraph");
    expect(result.doc.firstChild?.textContent).toBe("[ ]");
  });
});
