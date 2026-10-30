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
import {
  checkboxListInputRule,
  listWrappingInputRule,
} from "../lib/listInputRule";
import { RepairPlugin } from "../plugins/RepairPlugin";
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
    const assignIdsPlugin = new RepairPlugin({
      needsRepair: (node) => node.type.name === this.name && !node.attrs.id,
      repair: (state, lists) => {
        const tr = state.tr;
        lists.forEach(({ pos }) => {
          tr.setNodeAttribute(pos, "id", generateUuid());
        });
        return tr;
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
    return { block: "checkbox_list", getAttrs: () => ({ id: generateUuid() }) };
  }
}
