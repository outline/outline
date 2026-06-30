import { TextSelection } from "prosemirror-state";
import { createEditorState, codeBlock, doc } from "@shared/test/editor";
import { indentInCode, outdentInCode } from "./codeFence";

/**
 * Helper that runs a command against a code block document with the given
 * selection and returns the resulting code block text content.
 */
function runInCodeBlock(
  code: string,
  from: number,
  to: number,
  command: typeof outdentInCode
) {
  const testDoc = doc([codeBlock(code)]);
  let state = createEditorState(testDoc);
  state = state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, from, to))
  );

  let result = state;
  command(state, (tr) => {
    result = state.apply(tr);
  });

  return result.doc.firstChild?.textContent;
}

/**
 * Helper that selects the entire code block, indents it, then outdents it and
 * returns the resulting text content (which should match the input).
 */
function indentThenOutdentAll(code: string) {
  const testDoc = doc([codeBlock(code)]);
  let state = createEditorState(testDoc);

  const selectAll = () => {
    const block = state.doc.firstChild;
    const end = block ? block.nodeSize - 1 : 1;
    return state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1, end))
    );
  };

  state = selectAll();
  indentInCode(state, (tr) => {
    state = state.apply(tr);
  });

  state = selectAll();
  outdentInCode(state, (tr) => {
    state = state.apply(tr);
  });

  return state.doc.firstChild?.textContent;
}

describe("outdentInCode", () => {
  it("removes leading spaces from a single line", () => {
    // "  a" – cursor after the content (tab size 2)
    const text = runInCodeBlock("  a", 4, 4, outdentInCode);
    expect(text).toBe("a");
  });

  it("outdents all selected lines", () => {
    const code = "  a\n  b\n  c";
    // select from start of line 1 to end of line 3
    const text = runInCodeBlock(code, 1, code.length + 1, outdentInCode);
    expect(text).toBe("a\nb\nc");
  });

  it("does not affect lines above the selection", () => {
    // Four lines, each indented two spaces. Select only the last two lines.
    const code = "  a\n  b\n  c\n  d";
    // line three starts at position 9 (1-indexed inside the block)
    const startOfLine3 = "  a\n  b\n".length + 1;
    const text = runInCodeBlock(
      code,
      startOfLine3,
      code.length + 1,
      outdentInCode
    );
    // Lines 1 and 2 must keep their indentation, lines 3 and 4 outdented.
    expect(text).toBe("  a\n  b\nc\nd");
  });

  it("does not affect the line above when selecting a single later line", () => {
    const code = "  a\n  b\n  c";
    const startOfLine3 = "  a\n  b\n".length + 1;
    const text = runInCodeBlock(
      code,
      startOfLine3,
      code.length + 1,
      outdentInCode
    );
    expect(text).toBe("  a\n  b\nc");
  });

  it("removes only one indent step from already-indented nested lines", () => {
    // Two-space code with a deeper (four-space) nested line. Outdent must
    // remove two spaces per line, not four, even though a four-space run exists.
    const code = "a\n  b\n    c";
    const text = runInCodeBlock(code, 1, code.length + 1, outdentInCode);
    expect(text).toBe("a\nb\n  c");
  });
});

describe("indent then outdent", () => {
  it("round-trips two-space code without removing too many spaces", () => {
    const code = "function () {\n  return 1;\n}";
    expect(indentThenOutdentAll(code)).toBe(code);
  });

  it("round-trips four-space code", () => {
    const code = "def foo():\n    return 1";
    expect(indentThenOutdentAll(code)).toBe(code);
  });

  it("round-trips deeply nested two-space code", () => {
    const code = "function () {\n  if (x) {\n    return 1;\n  }\n}";
    expect(indentThenOutdentAll(code)).toBe(code);
  });
});

describe("indentInCode", () => {
  it("indents all selected lines without touching others", () => {
    const code = "a\nb\nc";
    const startOfLine2 = "a\n".length + 1;
    const text = runInCodeBlock(
      code,
      startOfLine2,
      code.length + 1,
      (state, dispatch) => indentInCode(state, dispatch)
    );
    expect(text).toBe("a\n  b\n  c");
  });
});
