import { NodeType } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "../lib/Extension";

export default class TrailingNode extends Extension {
  get name() {
    return "trailing_node";
  }

  get defaultOptions() {
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

            if (!insertNodeAtEnd) {
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
            return lastNode ? !disabledNodes.includes(lastNode.type) : false;
          },
          apply: (tr, value) => {
            if (!tr.docChanged) {
              return value;
            }

            const lastNode = tr.doc.lastChild;
            return lastNode ? !disabledNodes.includes(lastNode.type) : false;
          },
        },
      }),
    ];
  }
}
