import { Command, TextSelection } from "prosemirror-state";
import { isInCode } from "../queries/isInCode";

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

  // The easiest way to find the previous newline is to reverse the string and
  // perform a forward seach as if looking for the next newline.
  const beginningOfNode = $pos.pos - $pos.parentOffset;
  const startOfLine = $pos.parent.textContent
    .split("")
    .reverse()
    .join("")
    .indexOf("\n", $pos.parent.nodeSize - $pos.parentOffset - 2);
  const pos =
    startOfLine === -1
      ? beginningOfNode
      : beginningOfNode + ($pos.parent.nodeSize - startOfLine - 2);

  dispatch?.(
    state.tr.setSelection(TextSelection.create(state.doc, pos)).scrollIntoView()
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

  // find next newline or end of node
  const beginningOfNode = $pos.pos - $pos.parentOffset;
  const endOfLine = $pos.parent.textContent.indexOf("\n", $pos.parentOffset);
  const pos =
    endOfLine === -1
      ? beginningOfNode + $pos.parent.nodeSize - 2
      : beginningOfNode + endOfLine;

  dispatch?.(
    state.tr.setSelection(TextSelection.create(state.doc, pos)).scrollIntoView()
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
  let newText = "\n";

  if (text) {
    const splitByNewLine = text.split("\n");
    const numOfSpaces =
      splitByNewLine[splitByNewLine.length - 1].search(/\S|$/);
    newText += " ".repeat(numOfSpaces);
  }

  dispatch?.(tr.insertText(newText, selection.from, selection.to));
  return true;
};

/**
 * Insert two spaces to simulate the tab key.
 *
 * @returns A prosemirror command
 */
export const insertSpaceTab: Command = (state, dispatch) => {
  if (!isInCode(state)) {
    return false;
  }

  const { tr, selection } = state;
  dispatch?.(tr.insertText("  ", selection.from, selection.to));
  return true;
};
