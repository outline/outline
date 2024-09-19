import { Node, ResolvedPos } from "prosemirror-model";

/**
 * Find the start of the line that the current position is on.
 *
 * @param $pos The current resolved position
 * @param doc The current document
 * @returns The position of the start of the line as an integer.
 */
export function findStartOfLine($pos: ResolvedPos, doc: Node) {
  let lineStart = $pos.pos;
  const parentStart = $pos.pos - $pos.parentOffset;

  while (
    lineStart > parentStart &&
    doc.textBetween(lineStart - 1, lineStart) !== "\n"
  ) {
    lineStart--;
  }

  return lineStart;
}
