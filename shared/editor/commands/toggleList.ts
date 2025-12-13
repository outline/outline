import { NodeType } from "prosemirror-model";
import { liftListItem, wrapInList } from "prosemirror-schema-list";
import { Command } from "prosemirror-state";
import { chainTransactions } from "../lib/chainTransactions";
import { findParentNode } from "../queries/findParentNode";
import { isList } from "../queries/isList";
import clearNodes from "./clearNodes";

export default function toggleList(
  listType: NodeType,
  itemType: NodeType,
  listStyle?: string
): Command {
  return (state, dispatch) => {
    const { schema, selection } = state;
    const { $from, $to } = selection;
    const range = $from.blockRange($to);
    const { tr } = state;

    if (!range) {
      return false;
    }

    const parentList = findParentNode((node) => isList(node, schema))(
      selection
    );

    if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
      const currentStyle = parentList.node.attrs.listStyle;
      const differentListStyle = currentStyle && currentStyle !== listStyle;

      if (
        parentList.node.type === listType &&
        (!differentListStyle || !listStyle)
      ) {
        return liftListItem(itemType)(state, dispatch);
      }

      const currentItemType = parentList.node.content.firstChild?.type;
      const differentType = currentItemType && currentItemType !== itemType;

      if (differentType) {
        return chainTransactions(
          clearNodes(),
          wrapInList(listType, { listStyle })
        )(state, dispatch);
      }

      if (
        isList(parentList.node, schema) &&
        listType.validContent(parentList.node.content)
      ) {
        tr.doc.nodesBetween(
          parentList.pos,
          parentList.pos + parentList.node.nodeSize,
          (node, pos) => {
            if (isList(node, schema)) {
              tr.setNodeMarkup(pos, listType, listStyle ? { listStyle } : {});
            }
          }
        );

        dispatch?.(tr);
        return false;
      }
    }

    const attrs = listStyle ? { listStyle } : undefined;
    const canWrapInList = wrapInList(listType, attrs)(state);

    if (canWrapInList) {
      return wrapInList(listType, attrs)(state, dispatch);
    }

    return chainTransactions(clearNodes(), wrapInList(listType, attrs))(
      state,
      dispatch
    );
  };
}
