import type {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { v4 as generateUuid } from "uuid";
import toggleList from "../commands/toggleList";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import {
  checkboxListInputRule,
  listWrappingInputRule,
} from "../lib/listInputRule";
import { findBlockNodes } from "../queries/findChildren";
import { isInlineTransaction } from "../queries/isInlineTransaction";
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

    // Plugin to auto-assign IDs to checkbox lists
    const assignIdsPluginKey = new PluginKey<boolean>("checkboxListIds");
    const assignIdsPlugin = new Plugin<boolean>({
      key: assignIdsPluginKey,
      state: {
        // Whether any document change has been applied since load
        init: () => false,
        apply: (tr, hasChanged) => hasChanged || tr.docChanged,
      },
      appendTransaction: (txs, oldSt, newSt) => {
        if (!txs.some((t) => t.docChanged)) {
          return null;
        }

        // Lists loaded without ids are repaired on the first edit. After that
        // only structural edits can introduce a list without an id.
        const isFirstChange = !assignIdsPluginKey.getState(oldSt);
        const hasStructuralChange = txs.some(
          (t) =>
            t.docChanged &&
            !isInlineTransaction(t, (node) => node.type.name === this.name)
        );
        if (!isFirstChange && !hasStructuralChange) {
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
            new CheckboxListView(node, view, getPos, userIdentifier || ""),
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

  inputRules({ type, schema }: { type: NodeType; schema: Schema }) {
    const pattern = /^-?\s*(\[\s?\])\s$/i;
    return [
      // Convert an existing plain list to a checklist, keeping nesting intact.
      checkboxListInputRule(pattern, type, schema.nodes.checkbox_item),
      // Wrap a plain paragraph into a new checklist.
      listWrappingInputRule(pattern, type),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderList(node, "  ", () => "- ");
  }

  parseMarkdown() {
    return { block: "checkbox_list" };
  }
}
