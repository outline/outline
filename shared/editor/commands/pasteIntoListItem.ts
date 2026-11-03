import type { Node } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import { isList } from "../queries/isList";

/**
 * Replaces the selection in a list item with a slice copied from inside a list.
 * The copied items are added to the surrounding list at the cursor, rather
 * than nested in a new list inside the item or splitting the list.
 *
 * @param slice The pasted slice.
 * @returns A prosemirror command.
 */
export const pasteIntoListItem =
  (slice: Slice): Command =>
  (state, dispatch) => {
    const { selection } = state;
    if (!(selection instanceof TextSelection)) {
      return false;
    }

    const { $from, from, to } = selection;
    const listItem = $from.depth > 1 ? $from.node(-1) : undefined;
    if (
      !listItem ||
      !["list_item", "checkbox_item"].includes(listItem.type.name) ||
      !$from.parent.isTextblock
    ) {
      return false;
    }

    // The copied list and its first item must both be open in the slice.
    const list = slice.content.firstChild;
    if (slice.openStart < 2 || !list || !isList(list, state.schema)) {
      return false;
    }

    if (dispatch) {
      // Unlike replaceSelection this does not keep the defining list item from
      // the slice, so the open nodes are fitted into the list item at the cursor.
      const tr = state.tr.replace(from, to, appendTrailingBlocks(slice, list));
      dispatch(
        tr
          .setSelection(TextSelection.near(tr.doc.resolve(tr.mapping.map(to))))
          .scrollIntoView()
          .setMeta("paste", true)
          .setMeta("uiEvent", "paste")
      );
    }
    return true;
  };

/**
 * Moves the blocks that follow the list in the slice into new items at the end
 * of the list, so that they stay in the list they are pasted into.
 *
 * @param slice The pasted slice.
 * @param list The list at the start of the slice.
 * @returns The slice with the trailing blocks moved into the list.
 */
function appendTrailingBlocks(slice: Slice, list: Node): Slice {
  const { content, openStart, openEnd } = slice;
  const itemType = list.lastChild?.type;
  if (content.childCount === 1 || openEnd === 0 || !itemType) {
    return slice;
  }

  const items: Node[] = [];
  for (let i = 1; i < content.childCount; i++) {
    const block = content.child(i);
    if (
      isList(block, list.type.schema) ||
      !itemType.validContent(Fragment.from(block))
    ) {
      return slice;
    }
    items.push(itemType.create(null, block));
  }

  // The list and the last new item are now open around the last block.
  return new Slice(
    Fragment.from(list.copy(list.content.append(Fragment.from(items)))),
    openStart,
    openEnd + 2
  );
}
