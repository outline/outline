import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import some from "lodash/some";
import {
  chainCommands,
  createParagraphNear,
  joinForward,
  newlineInCode,
  splitBlock,
  wrapIn,
} from "prosemirror-commands";
import { ParseSpec } from "prosemirror-markdown";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Command, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import {
  Decoration,
  DecorationSet,
  DecorationSource,
  EditorView,
  NodeView,
} from "prosemirror-view";
import { v4 } from "uuid";
import Storage from "../../utils/Storage";
import {
  createParagraphBefore,
  split,
  lift,
  liftAfter,
  sinkBlockInto,
  liftLastBlockOutOf,
  ancestors,
  suchThat,
  depth,
  furthest,
} from "../commands/toggleBlock";
import { chainTransactions } from "../lib/chainTransactions";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findBlockNodes } from "../queries/findChildren";
import toggleBlocksRule from "../rules/toggleBlocks";
import Node from "./Node";

enum Action {
  CHANGE,
  INIT,
  FOLD,
  UNFOLD,
  DESTROY,
}

export default class ToggleBlock extends Node {
  static pluginKey = new PluginKey<DecorationSet>("toggleBlockPlugin");

  get name() {
    return "container_toggle_block";
  }

  get schema(): NodeSpec {
    return {
      content: "(paragraph | heading) block*",
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
          const decosToRestore: Decoration[] = [];
          value = value.map(tr.mapping, tr.doc, {
            onRemove: (decorationSpec) => {
              if (
                decorationSpec &&
                "target" in decorationSpec &&
                decorationSpec.target.startsWith(this.name)
              ) {
                const toggleBlock = findBlockNodes(tr.doc, true).find(
                  (block) =>
                    block.node.type.name === this.name &&
                    block.node.attrs.id === decorationSpec.nodeId
                );
                if (!isNil(toggleBlock)) {
                  if (decorationSpec.target === this.name) {
                    const start = toggleBlock.pos;
                    const end = toggleBlock.pos + toggleBlock.node.nodeSize;
                    decosToRestore.push(
                      Decoration.node(start, end, {}, decorationSpec)
                    );
                  } else {
                    const start = toggleBlock.pos + 1;
                    const end = start + toggleBlock.node.firstChild!.nodeSize;
                    decosToRestore.push(
                      Decoration.node(
                        start,
                        end,
                        {
                          nodeName: "div",
                          class: "toggle-block-head",
                        },
                        decorationSpec
                      )
                    );
                  }
                } else {
                  const key = `${decorationSpec.nodeId}:${this.editor.props.userId}`;
                  Storage.remove(key);
                }
              }
            },
          });

          if (!isEmpty(decosToRestore)) {
            value = value.add(tr.doc, decosToRestore);
          }

          const action = tr.getMeta(ToggleBlock.pluginKey);
          if (action) {
            if (action.type === Action.CHANGE) {
              const decosToRemove = value.find(
                undefined,
                undefined,
                (spec) => spec.target === `${this.name}>:firstChild`
              );
              value = value.remove(decosToRemove);

              const decosToApply = [];
              const toggleBlocks = findBlockNodes(tr.doc, true).filter(
                (block) => block.node.type.name === this.name
              );
              for (const toggleBlock of toggleBlocks) {
                const toggleBlockStart = toggleBlock.pos;
                const toggleBlockEnd =
                  toggleBlockStart + toggleBlock.node.nodeSize;
                const decoOnToggleBlockExists =
                  value.find(
                    toggleBlockStart,
                    toggleBlockEnd,
                    (spec) =>
                      spec.nodeId === toggleBlock.node.attrs.id &&
                      spec.target === this.name
                  ).length > 0;
                if (!decoOnToggleBlockExists) {
                  decosToApply.push(
                    Decoration.node(
                      toggleBlockStart,
                      toggleBlockEnd,
                      {},
                      {
                        target: this.name,
                        nodeId: toggleBlock.node.attrs.id,
                        fold: true,
                      }
                    )
                  );
                  const key = `${toggleBlock.node.attrs.id}:${this.editor.props.userId}`;
                  Storage.set(key, { fold: true });
                }
                const toggleBlockHeadStart = toggleBlock.pos + 1;
                const toggleBlockHeadEnd =
                  toggleBlockHeadStart + toggleBlock.node.firstChild!.nodeSize;
                const decoOnToggleBlockHeadExists =
                  value.find(
                    toggleBlockHeadStart,
                    toggleBlockHeadEnd,
                    (spec) =>
                      spec.nodeId === toggleBlock.node.attrs.id &&
                      spec.target === `${this.name}>:firstChild`
                  ).length > 0;
                if (!decoOnToggleBlockHeadExists) {
                  decosToApply.push(
                    Decoration.node(
                      toggleBlockHeadStart,
                      toggleBlockHeadEnd,
                      {
                        nodeName: "div",
                        class: "toggle-block-head",
                      },
                      {
                        target: `${this.name}>:firstChild`,
                        nodeId: toggleBlock.node.attrs.id,
                      }
                    )
                  );
                }
              }
              value = value.add(tr.doc, decosToApply);
            }
            if (action.type === Action.INIT) {
              for (const pos of action.positions) {
                const node = tr.doc.nodeAt(pos)!;
                const key = `${node.attrs.id}:${this.editor.props.userId}`;
                value = value.add(tr.doc, [
                  Decoration.node(
                    pos + 1,
                    pos + 1 + node.firstChild!.nodeSize,
                    {
                      nodeName: "div",
                      class: "toggle-block-head",
                    },
                    {
                      target: `${node.type.name}>:firstChild`,
                      nodeId: node.attrs.id,
                    }
                  ),
                ]);
                const foldState = Storage.get(key);
                if (isNil(foldState)) {
                  value = value.add(tr.doc, [
                    Decoration.node(
                      pos,
                      pos + node.nodeSize,
                      {},
                      {
                        target: `${node.type.name}`,
                        nodeId: node.attrs.id,
                        fold: true,
                      }
                    ),
                  ]);
                  Storage.set(key, { fold: true });
                } else {
                  value = value.add(tr.doc, [
                    Decoration.node(
                      pos,
                      pos + node.nodeSize,
                      {},
                      {
                        target: `${node.type.name}`,
                        nodeId: node.attrs.id,
                        fold: foldState.fold,
                      }
                    ),
                  ]);
                }
              }
            } else if (action.type === Action.FOLD) {
              const node = tr.doc.nodeAt(action.at)!;
              const decos = value.find(
                action.at,
                action.at + node.nodeSize,
                (spec) =>
                  spec.nodeId === node.attrs.id &&
                  spec.target === node.type.name &&
                  spec.fold === false
              );
              value = value.remove(decos);
              value = value.add(tr.doc, [
                Decoration.node(
                  action.at,
                  action.at + node.nodeSize,
                  {},
                  {
                    target: `${node.type.name}`,
                    nodeId: node.attrs.id,
                    fold: true,
                  }
                ),
              ]);
              const key = `${node.attrs.id}:${this.editor.props.userId}`;
              Storage.set(key, { fold: true });
            } else if (action.type === Action.UNFOLD) {
              const node = tr.doc.nodeAt(action.at)!;
              const decos = value.find(
                action.at,
                action.at + node.nodeSize,
                (spec) =>
                  spec.nodeId === node.attrs.id &&
                  spec.target === node.type.name &&
                  spec.fold === true
              );
              value = value.remove(decos);
              value = value.add(tr.doc, [
                Decoration.node(
                  action.at,
                  action.at + node.nodeSize,
                  {},
                  {
                    target: `${node.type.name}`,
                    nodeId: node.attrs.id,
                    fold: false,
                  }
                ),
              ]);
              const key = `${node.attrs.id}:${this.editor.props.userId}`;
              Storage.set(key, { fold: false });
            }
          }

          return value;
        },
      },
      appendTransaction: (transactions, _oldState, newState) => {
        const blocks = findBlockNodes(newState.doc, true);
        let tr = newState.tr;
        for (const block of blocks) {
          if (block.node.type.name === this.name && !block.node.attrs.id) {
            tr = tr.setNodeAttribute(block.pos, "id", v4());
          }
        }

        if (!foldPlugin.spec.initialDecorationsLoaded) {
          const positions = [];
          for (const block of blocks) {
            if (block.node.type.name === this.name) {
              positions.push(block.pos);
            }
          }
          tr.setMeta(ToggleBlock.pluginKey, {
            type: Action.INIT,
            positions,
          });
          foldPlugin.spec.initialDecorationsLoaded = true;
        }

        const docChanged = transactions.some(
          (transaction) => transaction.docChanged
        );

        if (docChanged) {
          tr = tr.setMeta(ToggleBlock.pluginKey, {
            type: Action.CHANGE,
          });

          const { $cursor } = tr.selection as TextSelection;
          if ($cursor) {
            const decosResponsibleForFolding = ToggleBlock.pluginKey
              .getState(newState)
              ?.find(undefined, undefined, (spec) => "fold" in spec);

            const ancestor =
              decosResponsibleForFolding && decosResponsibleForFolding.length
                ? furthest(
                    ancestors(
                      $cursor,
                      suchThat((_, a) =>
                        some(
                          decosResponsibleForFolding,
                          (deco) =>
                            deco.spec.nodeId === a.attrs?.id &&
                            deco.spec.target === a.type.name &&
                            deco.spec.fold === true
                        )
                      )
                    )
                  )
                : undefined;

            if (ancestor) {
              const posAfterAncestorHead =
                $cursor.start(depth(ancestor, $cursor)) +
                ancestor.firstChild!.nodeSize;
              const endOfAncestor = $cursor.end(depth(ancestor, $cursor));

              if (
                $cursor.pos > posAfterAncestorHead &&
                $cursor.pos < endOfAncestor
              ) {
                tr.setMeta(ToggleBlock.pluginKey, {
                  type: Action.UNFOLD,
                  at: $cursor.before(depth(ancestor, $cursor)),
                });
              }
            }
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

  get rulePlugins() {
    return [toggleBlocksRule];
  }

  keys({ type }: { type: NodeType }): Record<string, Command> {
    return {
      Backspace: lift,
      Enter: chainCommands(createParagraphBefore, split, (state, dispatch) => {
        const { $from } = state.selection;
        const parent = $from.node($from.depth - 1);
        if (parent.type.name !== this.name) {
          return false;
        }

        // if cursor lies within immediate first child, ignore the handling here
        if ($from.index($from.depth - 1) === 0) {
          return false;
        }

        return chainTransactions(
          newlineInCode,
          createParagraphNear,
          splitBlock
        )(state, dispatch);
      }),
      Delete: (state, dispatch) =>
        chainTransactions(liftAfter, joinForward)(state, dispatch),
      Tab: sinkBlockInto(type),
      "Shift-Tab": liftLastBlockOutOf(type),
    };
  }

  commands({ type }: { type: NodeType }) {
    return () => wrapIn(type);
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(state.repeat("+", 3 + height(node)) + "\n");
    state.renderContent(node);
    state.write(state.repeat("+", 3 + height(node)) + "\n");
  }

  parseMarkdown(): ParseSpec | void {
    return {
      block: "container_toggle_block",
    };
  }
}

const height = (node: ProsemirrorNode) => {
  if (node.isLeaf) {
    return 0;
  }

  let h = 0;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    h = Math.max(h, height(child));
  }

  return 1 + h;
};

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

    this.setFolded(decorations.some((deco) => deco.spec.fold));
  }

  update(_node: ProsemirrorNode, decorations: readonly Decoration[]) {
    const fold = decorations.some((deco) => deco.spec.fold);
    if (fold !== this.folded) {
      this.setFolded(fold);
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
    const actionType = this.folded ? Action.UNFOLD : Action.FOLD;
    const tr = view.state.tr.setMeta(ToggleBlock.pluginKey, {
      type: actionType,
      at: getPos(),
    });

    if (actionType === Action.FOLD) {
      const { $anchor } = view.state.selection;
      const node = view.state.doc.nodeAt(getPos()!)!;
      const startOfNode = getPos()! + 1;
      const endOfFirstChild = startOfNode + node.firstChild!.nodeSize;
      const endOfNode = startOfNode + node.nodeSize - 1;
      if ($anchor.pos > endOfFirstChild && $anchor.pos < endOfNode) {
        const $endOfFirstChild = view.state.doc.resolve(endOfFirstChild);
        tr.setSelection(TextSelection.near($endOfFirstChild, -1));
      }
    }
    view.dispatch(tr);
  }
}
