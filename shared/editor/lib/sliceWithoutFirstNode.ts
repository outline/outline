import { Slice } from "prosemirror-model";

/**
 * Removes the first top-level node from a slice. The open depths are clamped to
 * the remaining content, as the removed node may have been the one that they
 * referred to.
 *
 * @param slice the slice to remove the first node from.
 * @returns a new slice, or undefined if no content remains.
 */
export function sliceWithoutFirstNode(slice: Slice): Slice | undefined {
  const { firstChild } = slice.content;
  if (!firstChild) {
    return undefined;
  }

  const content = slice.content.cut(firstChild.nodeSize);
  if (content.childCount === 0) {
    return undefined;
  }

  const maxOpen = Slice.maxOpen(content);
  return new Slice(
    content,
    Math.min(slice.openStart, maxOpen.openStart),
    Math.min(slice.openEnd, maxOpen.openEnd)
  );
}
