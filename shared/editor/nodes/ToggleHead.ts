import { NodeSpec, NodeType, Schema } from "prosemirror-model";
import { Command, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Node from "./Node";

export default class ToggleHead extends Node {
  folded = false;
  static pluginKey = new PluginKey<DecorationSet>("toggleBlockPlugin");

  get name() {
    return "toggle_head";
  }

  keys(_options: { type: NodeType; schema: Schema }): Record<string, Command> {
    return {
      Enter: insertToggleBody(),
    };
  }

  get schema(): NodeSpec {
    return {
      content: "block",
      toDOM: () => {
        const dom = document.createElement("span");
        dom.classList.add("toggle-head");
        const button = document.createElement("button");
        button.innerHTML =
          '<svg fill="currentColor" width="12" height="24" viewBox="6 0 12 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.23823905,10.6097108 L11.207376,14.4695888 L11.207376,14.4695888 C11.54411,14.907343 12.1719566,14.989236 12.6097108,14.652502 C12.6783439,14.5997073 12.7398293,14.538222 12.792624,14.4695888 L15.761761,10.6097108 L15.761761,10.6097108 C16.0984949,10.1719566 16.0166019,9.54410997 15.5788477,9.20737601 C15.4040391,9.07290785 15.1896811,9 14.969137,9 L9.03086304,9 L9.03086304,9 C8.47857829,9 8.03086304,9.44771525 8.03086304,10 C8.03086304,10.2205442 8.10377089,10.4349022 8.23823905,10.6097108 Z" /></svg>';
        button.classList.add("heading-fold");
        if (this.folded) {
          button.classList.add("collapsed");
        }
        button.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const { view } = this.editor;
          const pos = view.posAtDOM(dom, 0);
          const { tr } = view.state;
          if (this.folded) {
            this.folded = false;
            button.classList.remove("collapsed");
            tr.setMeta(ToggleHead.pluginKey, { at: pos, fold: false });
          } else {
            this.folded = true;
            button.classList.add("collapsed");
            tr.setMeta(ToggleHead.pluginKey, { at: pos, fold: true });
          }

          view.dispatch(tr);
        });
        dom.appendChild(button);
        const contentDOM = document.createElement("span");
        contentDOM.style.overflow = "auto";
        dom.appendChild(contentDOM);

        return { dom, contentDOM };
      },
    };
  }

  get plugins() {
    const foldPlugin: Plugin<DecorationSet> = new Plugin({
      state: {
        init() {
          return DecorationSet.empty;
        },
        apply(tr, value) {
          const action = tr.getMeta(ToggleHead.pluginKey);
          if (action) {
            const $toggleHeadPos = tr.doc.resolve(action.at);
            const toggleBody = tr.doc.nodeAt($toggleHeadPos.after());
            if (toggleBody) {
              const $toggleBodyPos = tr.doc.resolve($toggleHeadPos.after() + 1);
              const from = $toggleBodyPos.before();
              const to = $toggleBodyPos.after();
              if (action.fold) {
                value = value.add(tr.doc, [
                  Decoration.node(from, to, {
                    class: "folded-content",
                  }),
                ]);
              } else {
                const deco = value.find(from, to);
                value = value.remove(deco);
              }
            }
          }

          return value;
        },
      },
      props: {
        decorations: (state) => foldPlugin.getState(state),
      },
    });
    return [foldPlugin];
  }
}

function insertToggleBody(): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    const node = $from.node($from.depth - 1);
    if (node.type.name !== "toggle_head") {
      return false;
    }
    const tr = state.tr;
    tr.insert(
      $from.after() + 1,
      state.schema.nodes["toggle_body"].create(
        {},
        state.schema.nodes.paragraph.create({})
      )
    )
      .setSelection(
        TextSelection.near(tr.doc.resolve(state.selection.to + 2), 1)
      )
      .scrollIntoView();
    if (dispatch) {
      dispatch(tr);
    }
    return true;
  };
}
