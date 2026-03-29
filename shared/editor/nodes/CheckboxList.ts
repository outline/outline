import type {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { v4 as generateUuid } from "uuid";
import toggleList from "../commands/toggleList";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { listWrappingInputRule } from "../lib/listInputRule";
import { findBlockNodes } from "../queries/findChildren";
import { CheckboxListView } from "./CheckboxListView";
import Node from "./Node";

export default class CheckboxList extends Node {
  get name() {
    return "checkbox_list";
  }

  get schema(): NodeSpec {
    return {
      group: "block list",
      content: "checkbox_item+",
      attrs: {
        id: { default: null },
      },
      toDOM: () => ["ul", { class: this.name }, 0],
      parseDOM: [
        {
          tag: `[class="${this.name}"]`,
        },
      ],
    };
  }

  get plugins() {
    const userIdentifier = this.editor.props.userId;
    const dictionary = this.editor.props.dictionary;

    // Plugin to auto-assign IDs to checkbox lists
    const assignIdsPlugin = new Plugin({
      appendTransaction: (txs, _oldSt, newSt) => {
        const hasDocChanges = txs.some((t) => t.docChanged);
        if (!hasDocChanges) {
          return null;
        }

        const checkboxLists = findBlockNodes(newSt.doc, true).filter(
          (b) => b.node.type.name === this.name && !b.node.attrs.id
        );

        if (checkboxLists.length === 0) {
          return null;
        }

        let modifyTx = newSt.tr;
        checkboxLists.forEach((listBlock) => {
          modifyTx.setNodeAttribute(listBlock.pos, "id", generateUuid());
        });
        return modifyTx;
      },
    });

    // Plugin to provide NodeViews
    const nodeViewPlugin = new Plugin({
      props: {
        nodeViews: {
          [this.name]: (node, view, getPos) =>
            new CheckboxListView(
              node,
              view,
              getPos,
              userIdentifier || "",
              dictionary
            ),
        },
      },
    });

    return [assignIdsPlugin, nodeViewPlugin];
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-7": toggleList(type, schema.nodes.checkbox_item),
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return () => toggleList(type, schema.nodes.checkbox_item);
  }

  inputRules({ type }: { type: NodeType }) {
    return [listWrappingInputRule(/^-?\s*(\[\s?\])\s$/i, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderList(node, "  ", () => "- ");
  }

  parseMarkdown() {
    return { block: "checkbox_list" };
  }
}
