import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import {
  splitListItem,
  sinkListItem,
  liftListItem,
} from "prosemirror-schema-list";
import { TextSelection, Command } from "prosemirror-state";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import getParentListItem from "../queries/getParentListItem";
import isInList from "../queries/isInList";
import Node from "./Node";

export default class ListItem extends Node {
  get name() {
    return "list_item";
  }

  get schema(): NodeSpec {
    return {
      content: "paragraph block*",
      defining: true,
      draggable: true,
      parseDOM: [{ tag: "li" }],
      toDOM: () => ["li", 0],
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      indentList: () => sinkListItem(type),
      outdentList: () => liftListItem(type),
    };
  }

  keys({ type }: { type: NodeType }): Record<string, Command> {
    return {
      Enter: splitListItem(type),
      Tab: sinkListItem(type),
      "Shift-Tab": liftListItem(type),
      "Mod-]": sinkListItem(type),
      "Mod-[": liftListItem(type),
      "Shift-Enter": (state, dispatch) => {
        if (!isInList(state)) {
          return false;
        }
        if (!state.selection.empty) {
          return false;
        }

        const { tr, selection } = state;
        dispatch?.(tr.split(selection.to));
        return true;
      },
      "Alt-ArrowUp": (state, dispatch) => {
        if (!state.selection.empty) {
          return false;
        }
        const result = getParentListItem(state);
        if (!result) {
          return false;
        }

        const [li, pos] = result;
        const $pos = state.doc.resolve(pos);

        if (
          !$pos.nodeBefore ||
          !["list_item", "checkbox_item"].includes($pos.nodeBefore.type.name)
        ) {
          return false;
        }

        const { tr } = state;
        const newPos = pos - $pos.nodeBefore.nodeSize;

        dispatch?.(
          tr
            .delete(pos, pos + li.nodeSize)
            .insert(newPos, li)
            .setSelection(TextSelection.near(tr.doc.resolve(newPos)))
        );
        return true;
      },
      "Alt-ArrowDown": (state, dispatch) => {
        if (!state.selection.empty) {
          return false;
        }
        const result = getParentListItem(state);
        if (!result) {
          return false;
        }

        const [li, pos] = result;
        const $pos = state.doc.resolve(pos + li.nodeSize);

        if (
          !$pos.nodeAfter ||
          !["list_item", "checkbox_item"].includes($pos.nodeAfter.type.name)
        ) {
          return false;
        }

        const { tr } = state;
        const newPos = pos + li.nodeSize + $pos.nodeAfter.nodeSize;

        dispatch?.(
          tr
            .insert(newPos, li)
            .setSelection(TextSelection.near(tr.doc.resolve(newPos)))
            .delete(pos, pos + li.nodeSize)
        );
        return true;
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderContent(node);
  }

  parseMarkdown() {
    return { block: "list_item" };
  }
}
