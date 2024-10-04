import { Node } from "prosemirror-model";

/**
 * Helper for iterating through the nodes in a document that changed
 * compared to the given previous document. Useful for avoiding
 * duplicate work on each transaction.
 */
export function changedDescendants(
  /** The previous node */
  old: Node,
  /** The current node */
  cur: Node,
  /** The offset of the current node */
  offset: number,
  /** The function to call for each changed node */
  callback: (node: Node, pos: number) => void
): void {
  const oldSize = old.childCount,
    curSize = cur.childCount;
  outer: for (let i = 0, j = 0; i < curSize; i++) {
    const child = cur.child(i);
    for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
      if (old.child(scan) === child) {
        j = scan + 1;
        offset += child.nodeSize;
        continue outer;
      }
    }
    callback(child, offset);
    if (j < oldSize && old.child(j).sameMarkup(child)) {
      changedDescendants(old.child(j), child, offset + 1, callback);
    } else {
      child.nodesBetween(0, child.content.size, callback, offset + 1);
    }
    offset += child.nodeSize;
  }
}
