import { exitCode } from "prosemirror-commands";
import type { Command, EditorState } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import { findNextNewline, findPreviousNewline } from "../queries/findNewlines";
import { isInCode } from "../queries/isInCode";
import { findParentNode } from "../queries/findParentNode";
import { isCode } from "../lib/isCode";
import { languagesWithFourSpaceIndent } from "../lib/code";

const newline = "\n";

/**
 * Moves the current selection to the previous newline, this is used inside
 * code fences only, prosemirror handles this functionality fine in other nodes.
 *
 * @returns A prosemirror command.
 */
export const moveToPreviousNewline: Command = (state, dispatch) => {
  if (!isInCode(state)) {
    return false;
  }

  const $pos = state.selection.$from;
  if (!$pos.parent.type.isTextblock) {
    return false;
  }

  dispatch?.(
    state.tr
      .setSelection(TextSelection.create(state.doc, findPreviousNewline($pos)))
      .scrollIntoView()
  );

  return true;
};

/**
 * Moves the current selection to the next newline, this is used inside code
 * fences only, prosemirror handles this functionality fine in other nodes.
 *
 * @returns A prosemirror command.
 */
export const moveToNextNewline: Command = (state, dispatch) => {
  if (!isInCode(state)) {
    return false;
  }

  const $pos = state.selection.$to;
  if (!$pos.parent.type.isTextblock) {
    return false;
  }

  dispatch?.(
    state.tr
      .setSelection(TextSelection.create(state.doc, findNextNewline($pos)))
      .scrollIntoView()
  );

  return true;
};

/**
 * Replace the selection with a newline character preceeded by a number of
 * spaces to have the new line align with the code on the previous. This is
 * standard code editor behavior.
 *
 * @returns A prosemirror command
 */
export const newlineInCode: Command = (state, dispatch) => {
  if (!isInCode(state)) {
    return false;
  }
  const { tr, selection } = state;
  const text = selection.$anchor.nodeBefore?.text;
  let newText = newline;

  if (text) {
    const splitByNewLine = text.split(newline);
    const offset = splitByNewLine[splitByNewLine.length - 1].search(/\S|$/);
    newText += " ".repeat(offset);
  }

  dispatch?.(tr.insertText(newText, selection.from, selection.to));
  return true;
};

/**
 * Indent the current selection by two spaces, accounting for multiple lines.
 *
 * @returns A prosemirror command
 */
export const indentInCode: Command = (state, dispatch) => {
  if (!isInCode(state, { onlyBlock: true })) {
    return false;
  }

  const tabSize = getTabSize(state);
  const spaces = " ".repeat(tabSize);
  const { tr, selection } = state;
  const { $from, from, to } = selection;

  // If the selection is empty, just insert two spaces at the cursor position.
  if (selection.empty) {
    dispatch?.(
      tr
        .insertText(spaces, from)
        .setSelection(TextSelection.create(tr.doc, from + spaces.length))
    );
    return true;
  }

  if (dispatch) {
    let line = 1;
    tr.insertText(spaces, findPreviousNewline($from));

    // Find all newlines in the selection and insert spaces before them.
    let index = from + 1;
    while (index <= to - 1 + line * tabSize) {
      const newLineBefore = tr.doc.textBetween(index - 1, index) === newline;
      if (newLineBefore) {
        tr.insertText(spaces, index);
        line++;
      }
      index++;
    }

    tr.setSelection(
      TextSelection.create(tr.doc, from + tabSize, to + line * tabSize)
    );

    dispatch(tr);
    return true;
  }

  return false;
};

/**
 * Outdent the current selection by two spaces, accounting for multiple lines.
 *
 * @returns A prosemirror command
 */
export const outdentInCode: Command = (state, dispatch) => {
  if (!isInCode(state, { onlyBlock: true })) {
    return false;
  }

  if (dispatch) {
    const { tr, selection } = state;
    const { $from, from, to } = selection;
    const selectionLength = to - from;

    // Find all newlines in the selection and remove tab-sized spaces before
    // them, working backwards to avoid changing the offset.
    let totalSpacesRemoved = 0;
    let spacesRemovedOnFirstLine = 0;
    const startOfFirstLine = findPreviousNewline($from);
    const tabSize = getTabSize(state);

    // Walk backwards from the end of the selection down to the start of its
    // first line. Deletions happen at positions >= index, so earlier positions
    // never shift and no offset compensation is needed. Stopping at
    // startOfFirstLine ensures lines above the selection are left untouched.
    let index = Math.max(to - 1, startOfFirstLine);

    while (index >= startOfFirstLine) {
      const newLineBefore =
        tr.doc.textBetween(index - 1, index) === newline ||
        index === startOfFirstLine;
      if (newLineBefore) {
        // Remove upto offset spaces from the start of the line.
        const textToConsider = tr.doc.textBetween(index, index + tabSize);

        // Find number of spaces in textToConsider
        let spaces = 0;
        for (let i = 0; i < textToConsider.length; i++) {
          if (textToConsider[i] === " ") {
            spaces++;
          } else {
            break;
          }
        }

        spacesRemovedOnFirstLine = spaces;

        if (spaces > 0) {
          tr.delete(index, index + spaces);
          totalSpacesRemoved += spaces;
        }
      }
      index--;
    }

    // Restore the selection, shifting each end back by the spaces removed
    // before it. Clamp to the start of the first line so a selection that
    // began within the removed leading whitespace doesn't underflow.
    const newFrom = Math.max(
      startOfFirstLine,
      to - selectionLength - spacesRemovedOnFirstLine
    );
    const newTo = Math.max(newFrom, to - totalSpacesRemoved);

    tr.setSelection(TextSelection.create(tr.doc, newFrom, newTo));

    dispatch(tr);
    return true;
  }

  return false;
};

/**
 * Exit the code block by moving the cursor to the end of the code block and
 * inserting a newline character.
 *
 * @returns A prosemirror command
 */
export const enterInCode: Command = (state, dispatch) => {
  if (!isInCode(state, { onlyBlock: true })) {
    return false;
  }
  const { selection } = state;
  const text = selection.$anchor.nodeBefore?.text;
  const selectionAtEnd =
    selection.$anchor.parentOffset === selection.$anchor.parent.nodeSize - 2;

  if (selectionAtEnd && text?.endsWith(newline)) {
    exitCode(state, dispatch);
    return true;
  }

  return newlineInCode(state, dispatch);
};

/**
 * Split a code block into two when three backticks are typed within it.
 * This creates a new code block below the current one with the same language.
 *
 * @returns A prosemirror command
 */
export const splitCodeBlockOnTripleBackticks: Command = (state, dispatch) => {
  if (!isInCode(state, { onlyBlock: true })) {
    return false;
  }

  const { tr, selection } = state;
  const { $from, from } = selection;

  // Get the text before the cursor to check for backticks
  const nodeBefore = $from.nodeBefore;
  const textBefore = nodeBefore?.text || "";
  const backticks = "``";

  // Check if the last three characters are backticks – this method is triggered on
  // the third backtick being typed, so we only need to check the previous two.
  if (!textBefore.endsWith(backticks)) {
    return false;
  }

  if (dispatch) {
    // Get position of parent node start
    const codeBlockStart = findParentNode(isCode)(selection)?.pos || 0;
    const backticksStart = Math.max(0, from - backticks.length - 1);
    if (backticksStart <= codeBlockStart) {
      return false;
    }

    tr.delete(backticksStart, from);

    // Split the node at the current position (minus the backticks)
    const pos = tr.mapping.map(backticksStart);
    tr.split(pos, 1);

    dispatch(tr);
    return true;
  }

  return true;
};

function getTabSize(state: EditorState): number {
  const codeBlock = findParentNode(isCode)(state.selection);
  if (!codeBlock) {
    return 2;
  }

  if (languagesWithFourSpaceIndent.includes(codeBlock.node.attrs.language)) {
    return 4;
  }

  // Infer the indent size from the existing indentation. Treat the block as
  // four-space indented only when every indented line is a multiple of four
  // spaces – a simple `includes("    ")` check misfires on two-space code,
  // which naturally contains four-space runs at deeper nesting levels or
  // immediately after an indent, causing outdent to remove too many spaces.
  // Only space characters are counted, since indent/outdent operate on spaces.
  let hasIndentedLine = false;
  for (const line of codeBlock.node.textContent.split(newline)) {
    const leadingSpaces = line.length - line.replace(/^ +/, "").length;
    // Ignore unindented and whitespace-only lines.
    if (leadingSpaces === 0 || leadingSpaces === line.length) {
      continue;
    }
    if (leadingSpaces % 4 !== 0) {
      return 2;
    }
    hasIndentedLine = true;
  }

  return hasIndentedLine ? 4 : 2;
}
