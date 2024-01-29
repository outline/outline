import { Node } from "prosemirror-model";
import { ReplaceStep } from "prosemirror-transform";

export function getReplaceStep(fromDoc: Node, toDoc: Node) {
  let start = toDoc.content.findDiffStart(fromDoc.content);
  if (start === null) {
    return false;
  }

  let { a: endA, b: endB } = toDoc.content.findDiffEnd(fromDoc.content) as {
    a: number;
    b: number;
  };
  const overlap = start - Math.min(endA, endB);
  if (overlap > 0) {
    // If there is an overlap, there is some freedom of choice in how to calculate the
    // start/end boundary. for an inserted/removed slice. We choose the extreme with
    // the lowest depth value.
    if (
      fromDoc.resolve(start - overlap).depth <
      toDoc.resolve(endA + overlap).depth
    ) {
      start -= overlap;
    } else {
      endA += overlap;
      endB += overlap;
    }
  }

  return new ReplaceStep(start, endB, toDoc.slice(start, endA));
}
