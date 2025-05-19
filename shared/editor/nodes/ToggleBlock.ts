import concat from "lodash/concat";
import filter from "lodash/filter";
import flatten from "lodash/flatten";
import forEach from "lodash/forEach";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";
import map from "lodash/map";
import some from "lodash/some";
import {
  chainCommands,
  createParagraphNear,
  joinForward,
  joinTextblockBackward,
  newlineInCode,
  splitBlock,
} from "prosemirror-commands";
import { wrappingInputRule } from "prosemirror-inputrules";
import { ParseSpec } from "prosemirror-markdown";
import {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
  ResolvedPos,
  Schema,
} from "prosemirror-model";
import {
  Command,
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { findWrapping } from "prosemirror-transform";
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
  liftNext,
  sinkBlockInto,
  liftLastBlockOutOf,
  ancestors,
  suchThat,
  depth,
  furthest,
  unfold,
  bodyIsEmpty,
  folded,
} from "../commands/toggleBlock";
import { CommandFactory } from "../lib/Extension";
import { chainTransactions } from "../lib/chainTransactions";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { PlaceholderPlugin } from "../plugins/PlaceholderPlugin";
import { findBlockNodes } from "../queries/findChildren";
import toggleBlocksRule from "../rules/toggleBlocks";
import Node from "./Node";

enum Action {
  INIT,
  CHANGE,
  FOLD,
  UNFOLD,
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
    const initPlugin = new Plugin({
      state: {
        init: () => {
          initPlugin.spec.docLoaded = false;
          return null;
        },
        apply: (_, value) => value,
      },
      appendTransaction: (_transactions, _oldState, newState) => {
        let tr = null;

        // mark the newly created toggle blocks as folded
        forEach(
          filter(
            findBlockNodes(newState.doc, true),
            (block) => block.node.type.name === this.name
          ),
          (toggleBlock) => {
            const key = `${toggleBlock.node.attrs.id}:${this.editor.props.userId}`;
            const foldState = Storage.get(key);
            if (isNil(foldState)) {
              Storage.set(key, { fold: true });
            }
          }
        );

        if (!initPlugin.spec.docLoaded) {
          tr = newState.tr.setMeta(ToggleBlock.pluginKey, {
            type: Action.INIT,
          });
          initPlugin.spec.docLoaded = true;
        }

        return tr;
      },
    });
    const foldPlugin: Plugin<DecorationSet> = new Plugin({
      key: ToggleBlock.pluginKey,
      state: {
        init: () => DecorationSet.empty,
        apply: (tr, value) => {
          let decosToRestore: Decoration[] = [];
          value = value.map(tr.mapping, tr.doc, {
            onRemove: (decorationSpec) => {
              const toggleBlock =
                decorationSpec && "nodeId" in decorationSpec
                  ? findBlockNodes(tr.doc, true).find(
                      (block) =>
                        block.node.type.name === this.name &&
                        block.node.attrs.id === decorationSpec.nodeId
                    )
                  : undefined;

              decosToRestore = filter(
                concat(
                  decosToRestore,
                  isNil(toggleBlock)
                    ? undefined
                    : decorationSpec.target === this.name
                    ? Decoration.node(
                        toggleBlock.pos,
                        toggleBlock.pos + toggleBlock.node.nodeSize,
                        {},
                        decorationSpec
                      )
                    : Decoration.node(
                        toggleBlock.pos + 1,
                        toggleBlock.pos +
                          1 +
                          toggleBlock.node.firstChild!.nodeSize,
                        {
                          nodeName: "div",
                          class: "toggle-block-head",
                        },
                        decorationSpec
                      )
                ),
                (deco) => !isNil(deco)
              );

              isNil(toggleBlock) &&
                Storage.remove(
                  `${decorationSpec.nodeId}:${this.editor.props.userId}`
                );
            },
          });

          if (!isEmpty(decosToRestore)) {
            value = value.add(tr.doc, decosToRestore);
          }

          const action = tr.getMeta(ToggleBlock.pluginKey);
          if (action) {
            if (action.type === Action.CHANGE) {
              value = value
                .remove(
                  value.find(
                    undefined,
                    undefined,
                    (spec) =>
                      spec.target === `${this.name}>:firstChild` ||
                      spec.target === this.name
                  )
                )
                .add(
                  tr.doc,
                  flatten(
                    map(
                      filter(
                        findBlockNodes(tr.doc, true),
                        (block) => block.node.type.name === this.name
                      ),
                      (toggleBlock) => [
                        Decoration.node(
                          toggleBlock.pos + 1,
                          toggleBlock.pos +
                            1 +
                            toggleBlock.node.firstChild!.nodeSize,
                          {
                            nodeName: "div",
                            class: "toggle-block-head",
                          },
                          {
                            target: `${this.name}>:firstChild`,
                            nodeId: toggleBlock.node.attrs.id,
                          }
                        ),
                        Decoration.node(
                          toggleBlock.pos,
                          toggleBlock.pos + toggleBlock.node.nodeSize,
                          {},
                          {
                            target: `${this.name}`,
                            nodeId: toggleBlock.node.attrs.id,
                            fold: Storage.get(
                              `${toggleBlock.node.attrs.id}:${this.editor.props.userId}`
                            ).fold,
                          }
                        ),
                      ]
                    )
                  )
                );
            }
            if (action.type === Action.INIT) {
              value = value.add(
                tr.doc,
                flatten(
                  map(
                    filter(
                      findBlockNodes(tr.doc, true),
                      (block) => block.node.type.name === this.name
                    ),
                    (toggleBlock) => [
                      Decoration.node(
                        toggleBlock.pos + 1,
                        toggleBlock.pos +
                          1 +
                          toggleBlock.node.firstChild!.nodeSize,
                        {
                          nodeName: "div",
                          class: "toggle-block-head",
                        },
                        {
                          target: `${this.name}>:firstChild`,
                          nodeId: toggleBlock.node.attrs.id,
                        }
                      ),
                      Decoration.node(
                        toggleBlock.pos,
                        toggleBlock.pos + toggleBlock.node.nodeSize,
                        {},
                        {
                          target: `${this.name}`,
                          nodeId: toggleBlock.node.attrs.id,
                          fold: Storage.get(
                            `${toggleBlock.node.attrs.id}:${this.editor.props.userId}`
                          ).fold,
                        }
                      ),
                    ]
                  )
                )
              );
            } else if (action.type === Action.FOLD) {
              const node = tr.doc.nodeAt(action.at)!;
              value = value
                .remove(
                  value.find(
                    action.at,
                    action.at + node.nodeSize,
                    (spec) =>
                      spec.nodeId === node.attrs.id &&
                      spec.target === node.type.name &&
                      spec.fold === false
                  )
                )
                .add(tr.doc, [
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
              value = value
                .remove(
                  value.find(
                    action.at,
                    action.at + node.nodeSize,
                    (spec) =>
                      spec.nodeId === node.attrs.id &&
                      spec.target === node.type.name &&
                      spec.fold === true
                  )
                )
                .add(tr.doc, [
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
        const docChanged = transactions.some(
          (transaction) => transaction.docChanged
        );
        let tr = null;

        if (docChanged) {
          tr = newState.tr.setMeta(ToggleBlock.pluginKey, {
            type: Action.CHANGE,
          });
        }

        tr = tr ? tr : newState.tr;
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
              innerDecorations,
              this.editor.props
            ),
        },
      },
    });

    return [
      initPlugin,
      foldPlugin,
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          const docChanged = transactions.some(
            (transaction) => transaction.docChanged
          );
          let tr = null;
          docChanged &&
            forEach(
              filter(
                findBlockNodes(newState.doc, true),
                (block) =>
                  block.node.type.name === this.name &&
                  block.node.childCount === 1 &&
                  !folded(block.node, newState)
              ),
              (toggleBlock) => {
                tr = newState.tr.setMeta(ToggleBlock.pluginKey, {
                  type: Action.FOLD,
                  at: toggleBlock.pos,
                });
              }
            );
          return tr;
        },
      }),
      new PlaceholderPlugin([
        {
          condition: (
            node: ProsemirrorNode,
            $start: ResolvedPos,
            parent: ProsemirrorNode | null,
            _state: EditorState
          ) =>
            !isNull(parent) &&
            parent.type.name === "container_toggle_block" &&
            $start.index($start.depth - 1) === 0 &&
            node.textContent === "",
          text: this.options.dictionary.emptyToggleBlockHead,
        },
        {
          condition: (
            _node: ProsemirrorNode,
            $start: ResolvedPos,
            parent: ProsemirrorNode | null,
            state: EditorState
          ) =>
            !isNull(parent) &&
            parent.type.name === "container_toggle_block" &&
            $start.index($start.depth - 1) === 1 &&
            bodyIsEmpty(parent) &&
            (state.selection.$from.pos < $start.pos ||
              state.selection.$from.pos > $start.end($start.depth - 1)),
          text: this.options.dictionary.emptyToggleBlockBody,
        },
      ]),
    ];
  }

  get rulePlugins() {
    return [toggleBlocksRule];
  }

  keys({ type }: { type: NodeType }): Record<string, Command> {
    return {
      Backspace: chainCommands(lift, (state, dispatch) => {
        const { $cursor } = state.selection as TextSelection;
        if (!$cursor) {
          return false;
        }

        if (!$cursor.node().isTextblock) {
          return false;
        }

        const $cut = state.doc.resolve($cursor.before());

        if (!$cut.nodeBefore || $cut.nodeBefore.type.name !== this.name) {
          return false;
        }

        return joinTextblockBackward(state, dispatch);
      }),
      Enter: chainCommands(
        createParagraphBefore,
        unfold,
        split,
        (state, dispatch) => {
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
        }
      ),
      Delete: (state, dispatch) =>
        chainTransactions(liftNext, joinForward)(state, dispatch),
      Tab: sinkBlockInto(type),
      "Shift-Tab": liftLastBlockOutOf(type),
    };
  }

  inputRules({ type }: { type: NodeType }) {
    return [wrappingInputRule(/^\s*\+\+\+\s$/, type)];
  }

  commands({ type }: { type: NodeType; schema: Schema }): CommandFactory {
    return () => (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to),
        wrapping = range && findWrapping(range, type, { id: v4() });
      if (!wrapping) {
        return false;
      }
      const tr = state.tr.wrap(range!, wrapping);
      dispatch?.(
        tr
          .insert(
            tr.selection.from + 1,
            state.schema.nodes.paragraph.create({})
          )
          .scrollIntoView()
      );
      return true;
    };
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
  node: ProsemirrorNode;
  view: EditorView;
  getPos: () => number | undefined;
  editorProps: Record<string, any>;

  constructor(
    node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
    decorations: readonly Decoration[],
    _innerDecorations: DecorationSource,
    editorProps: Record<string, any>
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
      this.toggleFold();
    });
    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "toggle-block-content";

    this.dom = document.createElement("div");
    this.dom.className = "toggle-block folded";

    this.dom.appendChild(this.button);
    this.dom.appendChild(this.contentDOM);

    this.setFolded(decorations.some((deco) => deco.spec.fold));

    this.node = node;
    this.view = view;
    this.getPos = getPos;

    this.editorProps = editorProps;

    window.addEventListener("storage", this.broadcastFoldState.bind(this));
  }

  broadcastFoldState(event: StorageEvent) {
    if (
      event.key &&
      event.key === `${this.node.attrs.id}:${this.editorProps.userId}`
    ) {
      if (!event.newValue || !event.oldValue) {
        return;
      }

      const newFoldState = JSON.parse(event.newValue);
      const oldFoldState = JSON.parse(event.oldValue);

      if (newFoldState.fold !== oldFoldState.fold) {
        this.toggleFold();
      }
    }
  }

  update(node: ProsemirrorNode, decorations: readonly Decoration[]) {
    const fold = decorations.some((deco) => deco.spec.fold);
    if (fold !== this.folded) {
      this.setFolded(fold);
    }
    this.node = node;
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

  private toggleFold() {
    const actionType = this.folded ? Action.UNFOLD : Action.FOLD;
    const tr = this.view.state.tr.setMeta(ToggleBlock.pluginKey, {
      type: actionType,
      at: this.getPos(),
    });

    if (actionType === Action.FOLD) {
      const { $anchor } = this.view.state.selection;
      const node = this.view.state.doc.nodeAt(this.getPos()!)!;
      const startOfNode = this.getPos()! + 1;
      const endOfFirstChild = startOfNode + node.firstChild!.nodeSize;
      const endOfNode = startOfNode + node.nodeSize - 1;
      if ($anchor.pos > endOfFirstChild && $anchor.pos < endOfNode) {
        const $endOfFirstChild = this.view.state.doc.resolve(endOfFirstChild);
        tr.setSelection(TextSelection.near($endOfFirstChild, -1));
      }
    } else {
      // append an empty paragraph if the toggle block's body is empty
      if (this.node.childCount === 1) {
        tr.insert(
          this.getPos()! + 1 + this.node.content.size,
          this.view.state.schema.nodes.paragraph.create({})
        );
      }
    }
    this.view.dispatch(tr);
  }

  destroy() {
    window.removeEventListener("storage", this.broadcastFoldState);
  }
}
