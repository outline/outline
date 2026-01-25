import filter from "lodash/filter";
import type { ResolvedPos } from "prosemirror-model";
import { findBlockNodes } from "./findChildren";

export function findCutAfterHeading($pos: ResolvedPos): ResolvedPos {
  const blocksAfterPos = filter(
    findBlockNodes($pos.doc, true),
    (block) => block.pos > $pos.pos
  );

  const d = $pos.depth - 1;
  const l = $pos.parent.attrs.level;
  let cut = $pos.end(-1);
  for (let i = blocksAfterPos.length - 1; i >= 0; i--) {
    const block = blocksAfterPos[i];
    const di = $pos.doc.resolve(block.pos).depth;
    const pi = block.pos;

    if (di < d) {
      cut = pi - 1;
      continue;
    }

    if (block.node.type.name === "heading") {
      const li = block.node.attrs.level;
      if (di === d && li <= l) {
        cut = pi - 1;
      }
    }
  }

  return $pos.doc.resolve(cut);
}
