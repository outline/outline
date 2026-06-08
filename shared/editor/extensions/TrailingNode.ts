import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "../lib/Extension";
import {
  requiresTrailingNode,
  trailingNodeNotAfter,
} from "../lib/trailingNode";

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
      notAfter: trailingNodeNotAfter,
    };
  }

  get plugins() {
    const plugin = new PluginKey(this.name);

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
          init: (_, state) =>
            requiresTrailingNode(state.doc, this.options.notAfter),
          apply: (tr, value) =>
            tr.docChanged
              ? requiresTrailingNode(tr.doc, this.options.notAfter)
              : value,
        },
      }),
    ];
  }
}
