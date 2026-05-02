import type { NodeType } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "../lib/Extension";

/**
 * Options for the TrailingNode extension.
 */
type TrailingNodeOptions = {
  /** Name of the node type to insert as the trailing node. */
  node: string;
  /** Node names after which a trailing node should not be inserted. */
  notAfter: string[];
};

export default class TrailingNode extends Extension<TrailingNodeOptions> {
  get name() {
    return "trailing_node";
  }

  get defaultOptions(): TrailingNodeOptions {
    return {
      node: "paragraph",
      notAfter: ["paragraph", "heading"],
    };
  }

  get plugins() {
    const plugin = new PluginKey(this.name);
    const disabledNodes = Object.entries(this.editor.schema.nodes)
      .map(([, value]) => value)
      .filter((node: NodeType) => this.options.notAfter.includes(node.name));

    return [
      new Plugin({
        key: plugin,
        view: () => ({
          update: (view) => {
            const { state } = view;
            const insertNodeAtEnd = plugin.getState(state);

            if (!insertNodeAtEnd || !view.editable) {
              return;
            }

            const { doc, schema, tr } = state;
            const type = schema.nodes[this.options.node];
            const transaction = tr.insert(doc.content.size, type.create());
            view.dispatch(transaction);
          },
        }),
        state: {
          init: (_, state) => {
            const lastNode = state.tr.doc.lastChild;

            // If paragraph has no text (only images/media), add trailing node
            if (
              lastNode?.type.name === "paragraph" &&
              lastNode.content.size > 0 &&
              lastNode.textContent.length === 0
            ) {
              return true;
            }

            return lastNode ? !disabledNodes.includes(lastNode.type) : false;
          },
          apply: (tr, value) => {
            if (!tr.docChanged) {
              return value;
            }

            const lastNode = tr.doc.lastChild;

            // If paragraph has no text (only images/media), add trailing node
            if (
              lastNode?.type.name === "paragraph" &&
              lastNode.content.size > 0 &&
              lastNode.textContent.length === 0
            ) {
              return true;
            }

            return lastNode ? !disabledNodes.includes(lastNode.type) : false;
          },
        },
      }),
    ];
  }
}
