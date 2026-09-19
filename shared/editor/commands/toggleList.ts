import type {
  Attrs,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { liftListItem, wrapInList } from "prosemirror-schema-list";
import type { Command } from "prosemirror-state";
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
        // Convert the list in place, preserving any nested list structure,
        // rather than clearing the nodes and re-wrapping which would flatten
        // nesting – this path is hit when toggling to or from a checklist.
        try {
          const converted = convertListType(
            parentList.node,
            listType,
            itemType,
            schema,
            listStyle ? { listStyle } : undefined
          );
          dispatch?.(
            tr.replaceWith(
              parentList.pos,
              parentList.pos + parentList.node.nodeSize,
              converted
            )
          );
          return true;
        } catch (_err) {
          return chainTransactions(
            clearNodes(),
            wrapInList(listType, { listStyle })
          )(state, dispatch);
        }
      }

      if (
        isList(parentList.node, schema) &&
        listType.validContent(parentList.node.content)
      ) {
        tr.doc.nodesBetween(
          parentList.pos,
          parentList.pos + parentList.node.nodeSize,
          (node, pos) => {
            // nodesBetween also visits the ancestors of the given range, these
            // must be skipped so that toggling a nested list does not convert
            // the lists it is nested within.
            if (
              pos >= parentList.pos &&
              isList(node, schema) &&
              listType.validContent(node.content)
            ) {
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

/**
 * Recursively converts a list node, its items, and any lists nested within
 * those items to the given list and item type, preserving nesting structure.
 *
 * @param node the list node to convert.
 * @param listType the node type to convert lists to.
 * @param itemType the node type to convert list items to.
 * @param schema the document schema.
 * @param attrs optional attributes for the converted lists.
 * @returns the converted list node.
 * @throws if the content of an item is not valid for the new item type.
 */
function convertListType(
  node: ProsemirrorNode,
  listType: NodeType,
  itemType: NodeType,
  schema: Schema,
  attrs?: Attrs
): ProsemirrorNode {
  const items: ProsemirrorNode[] = [];
  node.forEach((item) => {
    const content: ProsemirrorNode[] = [];
    item.forEach((child) => {
      content.push(
        isList(child, schema)
          ? convertListType(child, listType, itemType, schema, attrs)
          : child
      );
    });
    items.push(
      itemType.createChecked(
        item.type === itemType ? item.attrs : null,
        content,
        item.marks
      )
    );
  });
  return listType.createChecked(
    node.type === listType ? node.attrs : (attrs ?? null),
    items,
    node.marks
  );
}
