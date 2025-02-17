import { NodeSpec, NodeType } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import toggleWrap from "../commands/toggleWrap";
import Node from "./Node";

const pluginKey = new PluginKey("toggle_block");

export default class ToggleBlock extends Node {
  folded = false;

  get name() {
    return "toggle_block";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      group: "block",
      toDOM: () => {
        const dom = document.createElement("div");
        dom.style.position = "relative";
        const button = document.createElement("button");
        button.style.position = "absolute";
        button.style.left = "-12px";
        button.innerHTML =
          '<svg fill="currentColor" width="12" height="24" viewBox="6 0 12 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.23823905,10.6097108 L11.207376,14.4695888 L11.207376,14.4695888 C11.54411,14.907343 12.1719566,14.989236 12.6097108,14.652502 C12.6783439,14.5997073 12.7398293,14.538222 12.792624,14.4695888 L15.761761,10.6097108 L15.761761,10.6097108 C16.0984949,10.1719566 16.0166019,9.54410997 15.5788477,9.20737601 C15.4040391,9.07290785 15.1896811,9 14.969137,9 L9.03086304,9 L9.03086304,9 C8.47857829,9 8.03086304,9.44771525 8.03086304,10 C8.03086304,10.2205442 8.10377089,10.4349022 8.23823905,10.6097108 Z" /></svg>';
        button.classList.add("heading-fold");
        if (this.folded) {
          button.classList.add("collapsed");
        }
        button.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const { view } = this.editor;
          const pos = view.posAtDOM(contentDOM, 0);
          const { tr } = view.state;
          if (this.folded) {
            this.folded = false;
            button.classList.remove("collapsed");
            tr.setMeta(pluginKey, { pos, fold: false });
          } else {
            this.folded = true;
            button.classList.add("collapsed");
            tr.setMeta(pluginKey, { pos, fold: true });
          }

          view.dispatch(tr);
        });
        dom.appendChild(button);
        const contentDOM = document.createElement("div");
        dom.appendChild(contentDOM);

        return { dom, contentDOM };
      },
    };
  }

  get plugins() {
    const foldPlugin: Plugin = new Plugin({
      key: pluginKey,
      state: {
        init() {
          return DecorationSet.empty;
        },
        apply(tr, value) {
          const meta = tr.getMeta(pluginKey);
          if (meta) {
            const resolvedPos = tr.doc.resolve(meta.pos);
            const node = resolvedPos.parent;
            if (meta.fold) {
              let $from = meta.pos + node.firstChild?.nodeSize,
                $to;
              for (let i = 1; i < node.childCount; i++) {
                $to = $from + node.child(i).nodeSize;
                value = value.add(tr.doc, [
                  Decoration.node($from, $to, { class: "folded-content" }),
                ]);
                $from = $to;
              }
            } else {
              const $from = meta.pos + node.firstChild?.nodeSize;
              const $to = resolvedPos.after() - 1;
              const found = value.find($from, $to);
              if (found.length) {
                value = value.remove(found);
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

  commands({ type }: { type: NodeType }) {
    return () => toggleWrap(type);
  }
}
