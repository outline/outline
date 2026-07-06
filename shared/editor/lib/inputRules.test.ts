import type { Node } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import {
  createEditorStateWithSelection,
  doc,
  extensionManager,
  p,
  schema,
} from "@shared/test/editor";
import { applyInputRules } from "./inputRules";

const { bullet_list, list_item, paragraph, br } = schema.nodes;
const rules = extensionManager.inputRules({ schema });

/**
 * Returns the position at the end of the last text node whose content equals
 * the given string.
 *
 * @throws if no matching text node exists in the document.
 */
function posAfterText(node: Node, text: string) {
  let end = -1;
  node.descendants((child, pos) => {
    if (child.isText && child.text === text) {
      end = pos + text.length;
    }
  });
  if (end === -1) {
    throw new Error(`Text "${text}" not found in document`);
  }
  return end;
}

/**
 * Simulates typing a single character at the current selection and returns the
 * resulting state (unchanged when no input rule fires).
 */
function type(testDoc: Node, marker: string, char: string) {
  const state = createEditorStateWithSelection(
    testDoc,
    posAfterText(testDoc, marker)
  );
  const { from, to } = state.selection;
  const result = applyInputRules(state, from, to, char, rules);
  return result ? state.apply(result.tr) : state;
}

/** Builds a paragraph split by a hard break: `before` <br> `after`. */
function softBreakParagraph(before: string, after: string) {
  return paragraph.create(null, [
    schema.text(before),
    br.create(),
    schema.text(after),
  ]);
}

describe("applyInputRules", () => {
  it("creates a code block after a soft break inside a list item", () => {
    const testDoc = doc([
      bullet_list.create(null, [
        list_item.create(null, [
          softBreakParagraph("Run these commands.", "``"),
        ]),
      ]),
    ]);

    const result = type(testDoc, "``", "`");

    const item = result.doc.firstChild?.firstChild;
    expect(item?.type.name).toBe("list_item");
    expect(item?.childCount).toBe(2);
    expect(item?.child(0).type.name).toBe("paragraph");
    expect(item?.child(0).textContent).toBe("Run these commands.");
    expect(item?.child(1).type.spec.code).toBe(true);
    expect(item?.child(1).textContent).toBe("");
  });

  it("creates a code block after a soft break in a plain paragraph", () => {
    const testDoc = doc([softBreakParagraph("intro", "``")]);

    const result = type(testDoc, "``", "`");

    expect(result.doc.childCount).toBe(2);
    expect(result.doc.child(0).type.name).toBe("paragraph");
    expect(result.doc.child(0).textContent).toBe("intro");
    expect(result.doc.child(1).type.spec.code).toBe(true);
  });

  it("applies other block rules (heading) after a soft break", () => {
    const testDoc = doc([softBreakParagraph("intro", "#")]);

    const result = type(testDoc, "#", " ");

    expect(result.doc.childCount).toBe(2);
    expect(result.doc.child(0).textContent).toBe("intro");
    expect(result.doc.child(1).type.name).toBe("heading");
    expect(result.doc.child(1).attrs.level).toBe(1);
  });

  it("creates a math block after a soft break", () => {
    const testDoc = doc([softBreakParagraph("intro", "$$$")]);

    const result = type(testDoc, "$$$", " ");

    expect(result.doc.childCount).toBe(2);
    expect(result.doc.child(0).textContent).toBe("intro");
    expect(result.doc.child(1).type.name).toBe("math_block");
  });

  it("only peels off the last soft line when several breaks exist", () => {
    const testDoc = doc([
      paragraph.create(null, [
        schema.text("first"),
        br.create(),
        schema.text("second"),
        br.create(),
        schema.text("``"),
      ]),
    ]);

    const result = type(testDoc, "``", "`");

    expect(result.doc.childCount).toBe(2);
    // The first paragraph keeps its remaining soft break intact.
    expect(result.doc.child(0).textContent).toBe("first\nsecond");
    expect(result.doc.child(0).childCount).toBe(3);
    expect(result.doc.child(1).type.spec.code).toBe(true);
  });

  it("preserves the selection set by a rule handler after a soft break", () => {
    const testDoc = doc([softBreakParagraph("intro", "|-")]);

    const result = type(testDoc, "|-", "-");

    expect(result.doc.child(1).type.name).toBe("table");
    // The cursor lands in the first header cell, as at a block start.
    const { $from } = result.selection;
    expect($from.node(3).type.name).toBe("th");
    expect($from.index(1)).toBe(0);
    expect($from.index(2)).toBe(0);
  });

  it("still creates a code block at the start of an empty block", () => {
    const testDoc = doc([p("``")]);

    const result = type(testDoc, "``", "`");

    expect(result.doc.firstChild?.type.spec.code).toBe(true);
    expect(result.doc.firstChild?.textContent).toBe("");
  });

  it("does not fire when a plugin filters the intermediate transaction", () => {
    const testDoc = doc([softBreakParagraph("intro", "``")]);
    const base = createEditorStateWithSelection(
      testDoc,
      posAfterText(testDoc, "``")
    );
    const state = base.reconfigure({
      plugins: [new Plugin({ filterTransaction: () => false })],
    });
    const { from, to } = state.selection;

    expect(applyInputRules(state, from, to, "`", rules)).toBeNull();
  });

  it("does not fire when there is no preceding soft break", () => {
    const testDoc = doc([p("no code ``")]);

    const result = type(testDoc, "no code ``", "`");

    // The paragraph is untouched; the trigger char was not consumed.
    expect(result.doc.firstChild?.type.name).toBe("paragraph");
    expect(result.doc.firstChild?.textContent).toBe("no code ``");
  });
});
