import type { ResolvedPos, Schema } from "prosemirror-model";
import { Slice } from "prosemirror-model";
import { isList } from "../queries/isList";

/**
 * Removes the outer list from a pasted slice when the paste position is inside
 * a list of the same type, leaving the pasted items open so that they join
 * that list instead of being nested inside the current item.
 *
 * List items are defining, so when a slice is pasted at the start of an item
 * ProseMirror keeps the list and item wrappers copied along with the content
 * rather than fitting the content into the existing item.
 *
 * @param slice the pasted slice.
 * @param $pos the position the slice is pasted at.
 * @param schema the editor schema.
 * @returns the slice to paste, the given slice if it does not need to change.
 */
export function unwrapListSlice(
  slice: Slice,
  $pos: ResolvedPos,
  schema: Schema
): Slice {
  const outer = slice.content.firstChild;
  if (
    !outer ||
    slice.openStart < 1 ||
    slice.content.childCount !== 1 ||
    !isList(outer, schema)
  ) {
    return slice;
  }

  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (isList(node, schema)) {
      return node.type === outer.type
        ? new Slice(
            outer.content,
            slice.openStart - 1,
            Math.max(0, slice.openEnd - 1)
          )
        : slice;
    }
  }

  return slice;
}
