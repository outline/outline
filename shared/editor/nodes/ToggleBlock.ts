import isNil from "lodash/isNil";
import { wrapIn } from "prosemirror-commands";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import {
  Decoration,
  DecorationSet,
  DecorationSource,
  EditorView,
  NodeView,
} from "prosemirror-view";
import { v4 } from "uuid";
import Storage from "../../utils/Storage";
import { findBlockNodes } from "../queries/findChildren";
import Node from "./Node";

enum Action {
  INIT,
  FOLD,
  UNFOLD,
  DESTROY,
}

export default class ToggleBlock extends Node {
  static pluginKey = new PluginKey<DecorationSet>("toggleBlockPlugin");

  get name() {
    return "toggle_block";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      group: "block",
      attrs: {
        id: { default: undefined },
      },
      toDOM: () => [
        "div",
        { class: "toggle-block" },
        ["div", { class: "toggle-block-content" }, 0],
      ],
    };
  }

  get plugins() {
    const foldPlugin: Plugin<DecorationSet> = new Plugin({
      key: ToggleBlock.pluginKey,
      state: {
        init: () => {
          foldPlugin.spec.initialDecorationsLoaded = false;
          return DecorationSet.empty;
        },
        apply: (tr, value) => {
          let decoToRestore;
          value = value.map(tr.mapping, tr.doc, {
            onRemove: (decorationSpec) => {
              if (decorationSpec && decorationSpec.id) {
                const block = findBlockNodes(tr.doc).find(
                  (blk) =>
                    blk.node.type.name === this.name &&
                    blk.node.attrs.id === decorationSpec.id
                );
                if (!isNil(block)) {
                  decoToRestore = Decoration.node(
                    block.pos,
                    block.pos + block.node.nodeSize,
                    {},
                    decorationSpec
                  );
                } else {
                  const key = `${decorationSpec.id}:${this.editor.props.userId}`;
                  Storage.remove(key);
                }
              }
            },
          });

          if (!isNil(decoToRestore)) {
            value = value.add(tr.doc, [decoToRestore]);
          }

          const action = tr.getMeta(ToggleBlock.pluginKey);
          if (action) {
            if (action.type === Action.INIT) {
              for (const pos of action.positions) {
                const node = tr.doc.nodeAt(pos)!;
                const key = `${node.attrs.id}:${this.editor.props.userId}`;
                const unfoldState = Storage.get(key);
                if (!isNil(unfoldState)) {
                  value = value.add(tr.doc, [
                    Decoration.node(
                      pos,
                      pos + node.nodeSize,
                      {},
                      { unfold: unfoldState.unfold, id: node.attrs.id }
                    ),
                  ]);
                }
              }
            } else if (action.type === Action.FOLD) {
              const deco = value.find(
                action.at + 1,
                action.at + 1,
                (spec) => spec.unfold
              );
              if (deco.length) {
                value = value.remove(deco);
                const node = tr.doc.nodeAt(action.at)!;
                const key = `${node.attrs.id}:${this.editor.props.userId}`;
                Storage.remove(key);
              }
            } else if (action.type === Action.UNFOLD) {
              const node = tr.doc.nodeAt(action.at)!;
              value = value.add(tr.doc, [
                Decoration.node(
                  action.at,
                  action.at + node.nodeSize,
                  {},
                  { unfold: true, id: node.attrs.id }
                ),
              ]);
              const key = `${node.attrs.id}:${this.editor.props.userId}`;
              Storage.set(key, { unfold: true });
            }
          }

          return value;
        },
      },
      appendTransaction: (transactions, _oldState, newState) => {
        const docChanged = transactions.some(
          (transaction) => transaction.docChanged
        );
        let tr = null;
        if (docChanged) {
          const blocks = findBlockNodes(newState.doc);
          tr = newState.tr;
          for (const block of blocks) {
            if (
              block.node.type.name === "toggle_block" &&
              !block.node.attrs.id
            ) {
              tr = tr.setNodeAttribute(block.pos, "id", v4());
            }
          }

          if (!foldPlugin.spec.initialDecorationsLoaded) {
            const positions = [];
            for (const block of blocks) {
              if (block.node.type.name === "toggle_block") {
                positions.push(block.pos);
              }
            }
            tr.setMeta(ToggleBlock.pluginKey, {
              type: Action.INIT,
              positions,
            });
            foldPlugin.spec.initialDecorationsLoaded = true;
          }
        }

        return tr;
      },
      props: {
        decorations: (state) => ToggleBlock.pluginKey.getState(state),
        nodeViews: {
          [this.name]: (node, view, getPos, decorations, innerDecorations) =>
            new ToggleBlockView(
              node,
              view,
              getPos,
              decorations,
              innerDecorations
            ),
        },
      },
    });

    return [foldPlugin];
  }

  commands({ type }: { type: NodeType }) {
    return () => wrapIn(type);
  }
}

class ToggleBlockView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLDivElement;
  button: HTMLButtonElement;
  folded: boolean;

  constructor(
    _node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
    decorations: readonly Decoration[],
    _innerDecorations: DecorationSource
  ) {
    this.button = document.createElement("button");
    this.button.className = "toggle-block-button";
    this.button.contentEditable = "false";
    this.button.innerHTML =
      '<svg fill="currentColor" width="12" height="24" viewBox="6 0 12 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.23823905,10.6097108 L11.207376,14.4695888 L11.207376,14.4695888 C11.54411,14.907343 12.1719566,14.989236 12.6097108,14.652502 C12.6783439,14.5997073 12.7398293,14.538222 12.792624,14.4695888 L15.761761,10.6097108 L15.761761,10.6097108 C16.0984949,10.1719566 16.0166019,9.54410997 15.5788477,9.20737601 C15.4040391,9.07290785 15.1896811,9 14.969137,9 L9.03086304,9 L9.03086304,9 C8.47857829,9 8.03086304,9.44771525 8.03086304,10 C8.03086304,10.2205442 8.10377089,10.4349022 8.23823905,10.6097108 Z" /></svg>';
    this.button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      if (event.button !== 0) {
        return;
      }
      this.toggleFold(view, getPos);
    });
    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "toggle-block-content";

    this.dom = document.createElement("div");
    this.dom.className = "toggle-block folded";

    this.dom.appendChild(this.button);
    this.dom.appendChild(this.contentDOM);

    this.setFolded(
      !decorations.length || decorations.some((deco) => !deco.spec.unfold)
    );
  }

  update(_node: ProsemirrorNode, decorations: readonly Decoration[]) {
    const folded =
      !decorations.length || decorations.some((deco) => !deco.spec.unfold);
    if (folded !== this.folded) {
      this.setFolded(folded);
    }
    return true;
  }

  private setFolded(folded: boolean) {
    this.folded = folded;
    if (this.folded) {
      this.dom.classList.add("folded");
    } else {
      this.dom.classList.remove("folded");
    }
  }

  private toggleFold(view: EditorView, getPos: () => number | undefined) {
    const tr = view.state.tr.setMeta(ToggleBlock.pluginKey, {
      type: this.folded ? Action.UNFOLD : Action.FOLD,
      at: getPos(),
    });
    view.dispatch(tr);
  }
}
