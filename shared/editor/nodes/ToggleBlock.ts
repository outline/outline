import concat from "lodash/concat";
import filter from "lodash/filter";
import findIndex from "lodash/findIndex";
import flatten from "lodash/flatten";
import forEach from "lodash/forEach";
import forEachRight from "lodash/forEachRight";
import isEmpty from "lodash/isEmpty";
import isEqual from "lodash/isEqual";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";
import map from "lodash/map";
import some from "lodash/some";
import uniqWith from "lodash/uniqWith";
import { chainCommands, newlineInCode } from "prosemirror-commands";
import { wrappingInputRule } from "prosemirror-inputrules";
import { ParseSpec } from "prosemirror-markdown";
import {
  Fragment,
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
  Schema,
  Slice,
} from "prosemirror-model";
import {
  Command,
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
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
  deleteSelectionPreservingBody,
  joinForwardPreservingBody,
  selectNodeForwardPreservingBody,
  joinBackwardWithToggleblock,
  selectNodeBackwardPreservingBody,
  createParagraphNearPreservingBody,
  liftAllEmptyChildBlocks,
  liftAllChildBlocksOfNodeAfter,
  splitBlockPreservingBody,
  toggleBlock,
  liftAllChildBlocksOfNodeBefore,
  indentBlock,
  dedentBlocks,
  splitTopLevelBlockWithinBody,
} from "../commands/toggleBlock";
import { CommandFactory } from "../lib/Extension";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { PlaceholderPlugin } from "../plugins/PlaceholderPlugin";
import { findBlockNodes } from "../queries/findChildren";
import { findCutAfterHeading } from "../queries/findCutAfterHeading";
import { isNodeActive } from "../queries/isNodeActive";
import toggleBlocksRule from "../rules/toggleBlocks";
import {
  ancestors,
  furthest,
  height,
  liftChildrenOfNodeAt,
  nearest,
} from "../utils";
import Node from "./Node";

export enum Action {
  DOC_INIT,
  DOC_CHANGE,
  FOLD,
  UNFOLD,
}

export enum On {
  FOLD,
  UNFOLD,
}

export default class ToggleBlock extends Node {
  static actionPluginKey = new PluginKey<DecorationSet>(
    "toggleBlockActionPlugin"
  );

  static eventPluginKey = new PluginKey("toggleBlockEventPlugin");

  get name() {
    return "container_toggle";
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
          initPlugin.spec.init = true;
          return null;
        },
        apply: (_, value) => value,
      },
      appendTransaction: (transactions, _oldState, newState) => {
        const docChanged = transactions.some(
          (transaction) => transaction.docChanged
        );
        let tr = null;

        if (docChanged) {
          // make sure to assign ids to toggle blocks that don't have one
          // though id is explicitly assigned when a toggle block is created,
          // still, it might just happen that a toggle block gets created as
          // a consequence of some other action, e.g, a split operation
          // this code ensures that all toggle blocks have an id
          tr = newState.tr;
          forEach(
            filter(
              findBlockNodes(newState.doc, true),
              (block) =>
                block.node.type.name === this.name && !block.node.attrs.id
            ),
            (toggleBlock) => {
              tr!.setNodeAttribute(toggleBlock.pos, "id", v4());
            }
          );
        }

        // mark the newly created toggle blocks as unfolded
        // note that this is kept outside of the `docChanged` check
        // so that it works for publicly shared docs too
        forEach(
          filter(
            findBlockNodes(tr ? tr.doc : newState.doc, true),
            (block) => block.node.type.name === this.name
          ),
          (toggleBlock) => {
            const key = `${toggleBlock.node.attrs.id}:${this.editor.props.userId}`;
            const foldState = Storage.get(key);
            if (isNil(foldState)) {
              Storage.set(key, { fold: false });
            }
          }
        );

        // This weird looking code ensures that `Action.DOC_INIT` is dispatched
        // when the document content is loaded. It was observed that for some
        // reason when `MultiplayerEditor` component rendered, the `init()` method
        // above always received an empty doc(doc with and empty para). The doc's
        // actual content, only got available after the first `tr` with `tr.docChanged == true`.
        // Therefore, for multiplayer case, `Action.DOC_INIT` is dispatched within the check.
        //
        // However, for non-multiplayer case, e.g, loading publicly shared docs, the doc's actual
        // content was available right away, so it's handle in the respective manner.
        if (initPlugin.spec.init) {
          if (
            some(this.editor.props.extensions, (e) => e.name === "multiplayer")
          ) {
            if (docChanged) {
              tr = tr!.setMeta(ToggleBlock.actionPluginKey, {
                type: Action.DOC_INIT,
              });
              initPlugin.spec.init = false;
            }
          } else {
            tr = tr
              ? tr.setMeta(ToggleBlock.actionPluginKey, {
                  type: Action.DOC_INIT,
                })
              : newState.tr.setMeta(ToggleBlock.actionPluginKey, {
                  type: Action.DOC_INIT,
                });
            initPlugin.spec.init = false;
          }
        }

        return tr;
      },
    });
    const actionPlugin: Plugin<DecorationSet> = new Plugin({
      key: ToggleBlock.actionPluginKey,
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

              if (isNil(toggleBlock)) {
                Storage.remove(
                  `${decorationSpec.nodeId}:${this.editor.props.userId}`
                );
              }
            },
          });

          if (!isEmpty(decosToRestore)) {
            value = value.add(tr.doc, decosToRestore);
          }

          // Make sure that the set maintains unique decorations because
          // `DecorationSet.remove` doesn't seem to remove duplicates. As a result,
          // decoration is applied multiple times to a node, messing up its UI.
          value = DecorationSet.create(
            tr.doc,
            uniqWith(value.find(), (a, b) => isEqual(a, b))
          );

          const action = tr.getMeta(ToggleBlock.actionPluginKey);
          if (action) {
            if (action.type === Action.DOC_CHANGE) {
              // A document change could move the decoration on toggle block head, out
              // of sync with the corresponding decoration on toggle block. So, we reapply
              // those decorations to their respective positions.
              value = value
                .remove(
                  value.find(
                    undefined,
                    undefined,
                    (spec) => spec.target === `${this.name}>:firstChild`
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
                      ]
                    )
                  )
                );
            }
            if (action.type === Action.DOC_INIT) {
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
          tr = newState.tr.setMeta(ToggleBlock.actionPluginKey, {
            type: Action.DOC_CHANGE,
          });
        }

        return tr;
      },
      props: {
        decorations: (state) => ToggleBlock.actionPluginKey.getState(state),
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

    // this plugin executes appropriate tasks which should be executed
    // following toggling
    const eventPlugin = new Plugin({
      key: ToggleBlock.eventPluginKey,
      appendTransaction: (transactions, _oldState, newState) => {
        const transaction = transactions.find((tr) =>
          tr.getMeta(ToggleBlock.eventPluginKey)
        );

        let tr = null;

        if (transaction) {
          const event = transaction.getMeta(ToggleBlock.eventPluginKey);
          const node = newState.doc.nodeAt(event.at)!;
          if (event.type === On.FOLD) {
            // If folded, the cursor, lying within the hidden body should be
            // moved to the end of head upon fold.
            const { $anchor } = newState.selection;
            const startOfNode = event.at + 1;
            const endOfFirstChild = startOfNode + node.firstChild!.nodeSize;
            const endOfNode = startOfNode + node.nodeSize - 1;
            if ($anchor.pos > endOfFirstChild && $anchor.pos < endOfNode) {
              const $endOfFirstChild = newState.doc.resolve(endOfFirstChild);
              tr = newState.tr.setSelection(
                TextSelection.near($endOfFirstChild, -1)
              );
            }
          } else {
            // If unfolded, with non-existent body, an empty paragraph
            // should be inserted as body upon unfold. Why? To make the placeholder
            // visible for an empty body. Placeholder requires node with
            // empty content so it's a hack to display placeholder.
            if (node.childCount === 1) {
              tr = newState.tr.insert(
                event.at + 1 + node.content.size,
                newState.schema.nodes.paragraph.create({})
              );
            }
          }
        }

        tr = tr ? tr : newState.tr;
        const { $from } = tr.selection;
        if ($from) {
          // If somehow, selection ends up within the body of a folded toggle block,
          // unfold that toggle block.
          const decosResponsibleForFolding = ToggleBlock.actionPluginKey
            .getState(newState)
            ?.find(undefined, undefined, (spec) => "fold" in spec);

          const { depth } = ToggleBlock.getUtils(newState);
          const toggleBlock =
            decosResponsibleForFolding && decosResponsibleForFolding.length
              ? furthest(
                  ancestors($from, (ancestor) =>
                    some(
                      decosResponsibleForFolding,
                      (deco) =>
                        deco.spec.nodeId === ancestor.attrs?.id &&
                        deco.spec.target === ancestor.type.name &&
                        deco.spec.fold === true
                    )
                  )
                )
              : undefined;

          if (toggleBlock) {
            const posAfterHead =
              $from.start(depth(toggleBlock)) +
              toggleBlock.firstChild!.nodeSize;
            const posAtEnd = $from.end(depth(toggleBlock));

            if ($from.pos > posAfterHead && $from.pos < posAtEnd) {
              tr.setMeta(ToggleBlock.actionPluginKey, {
                type: Action.UNFOLD,
                at: $from.before(depth(toggleBlock)),
              });
            }
          }
        }

        return tr;
      },
    });

    // this plugin is used to resolve new valid position for toggle block if attempted
    // to be inserted where it's not allowed, e.g., at the start of a list item––in this case
    // it pushes the toggle block down by inserting a paragraph before it
    const positionResolverPlugin = new Plugin({
      appendTransaction: (transactions, _oldState, newState) => {
        const resolve = (pos: number, tr: Transaction) =>
          tr.insert(pos, newState.schema.nodes.paragraph.create({}));

        const predicate = (pos: number, type: NodeType) => {
          const $pos = newState.doc.resolve(pos);
          return type === $pos.parent.type && $pos.parentOffset === 0;
        };

        const docChanged = transactions.some(
          (transaction) => transaction.docChanged
        );
        let tr: Transaction | null = null;
        if (docChanged) {
          // Notice that we're executing `resolve` over the blocks in reverse order. Why?
          //
          // Let's consider that we've got toggle blocks in positions
          // p0, p1, p2 & p4. Now, if `resolve` runs on p0 first, the toggle blocks
          // which were at p1, p2 and p3 might no longer be there
          // as a consequence of `resolve` being invoked on p0!
          //
          // On the other hand, if `resolve` runs on p4 first, all the preceding positions
          // remain unaffected in the sense that they'd still point to their respective
          // toggle blocks.
          forEachRight(
            filter(
              findBlockNodes(newState.doc, true),
              (block) =>
                block.node.type.name === this.name &&
                predicate(block.pos, newState.schema.nodes.list_item)
            ),
            (toggleBlock) => {
              tr = resolve(toggleBlock.pos, tr ? tr : newState.tr);
            }
          );
        }

        return tr;
      },
    });

    return [
      initPlugin,
      actionPlugin,
      eventPlugin,
      // This plugin ensures that toggle blocks with non-existent body remain folded.
      // An example where this can be seen in action is when backspace is pressed with
      // cursor being at the start of an empty body.
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          const docChanged = transactions.some(
            (transaction) => transaction.docChanged
          );
          let tr = null;

          if (docChanged) {
            forEach(
              filter(
                findBlockNodes(newState.doc, true),
                (block) =>
                  block.node.type.name === this.name &&
                  block.node.childCount === 1 &&
                  !ToggleBlock.getUtils(newState).folded(block.node)
              ),
              (toggleBlock) => {
                tr = newState.tr.setMeta(ToggleBlock.actionPluginKey, {
                  type: Action.FOLD,
                  at: toggleBlock.pos,
                });
              }
            );
          }

          return tr;
        },
      }),
      positionResolverPlugin,
      new PlaceholderPlugin([
        {
          condition: ({ node, $start, parent }) =>
            !isNull(parent) &&
            parent.type.name === "container_toggle" &&
            $start.index($start.depth - 1) === 0 &&
            node.textContent === "",
          text: this.options.dictionary.emptyToggleBlockHead,
        },
        {
          condition: ({ parent, $start, state }) =>
            !isNull(parent) &&
            parent.type.name === "container_toggle" &&
            $start.index($start.depth - 1) === 1 &&
            ToggleBlock.isBodyEmpty(parent) &&
            (state.selection.$from.pos < $start.pos ||
              state.selection.$from.pos > $start.end($start.depth - 1)),
          text: this.options.dictionary.emptyToggleBlockBody,
        },
        {
          condition: ({ node, parent, $start, state }) =>
            !isNull(parent) &&
            parent.type.name === "container_toggle" &&
            node.isTextblock &&
            node.textContent === "" &&
            (state.selection as TextSelection).$cursor?.pos === $start.pos,
          text: this.options.dictionary.emptyTextBlockWithinToggleBlock,
        },
      ]),
    ];
  }

  get rulePlugins() {
    return [toggleBlocksRule];
  }

  keys(): Record<string, Command> {
    return {
      Backspace: chainCommands(
        deleteSelectionPreservingBody,
        liftAllChildBlocksOfNodeBefore,
        joinBackwardWithToggleblock,
        selectNodeBackwardPreservingBody
      ),
      Enter: chainCommands(
        newlineInCode,
        createParagraphNearPreservingBody,
        liftAllEmptyChildBlocks,
        splitBlockPreservingBody,
        splitTopLevelBlockWithinBody
      ),
      Delete: chainCommands(
        deleteSelectionPreservingBody,
        liftAllChildBlocksOfNodeAfter,
        joinForwardPreservingBody,
        selectNodeForwardPreservingBody
      ),
      Tab: indentBlock,
      "Shift-Tab": dedentBlocks,
      "Mod-Enter": toggleBlock,
    };
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      wrappingInputRule(
        /^\s*\+\+\+\s$/,
        type,
        undefined,
        (_match, _node) => false
      ),
    ];
  }

  commands({
    type,
    schema,
  }: {
    type: NodeType;
    schema: Schema;
  }): CommandFactory {
    return () => (state, dispatch) => {
      const { $from, $to } = state.selection;
      if (isNodeActive(type)(state)) {
        dispatch?.(liftChildrenOfNodeAt($from.before(-1), state.tr));
        return true;
      }
      // if heading
      if ($from.parent.type === state.schema.nodes.heading) {
        const $fr_ = TextSelection.near($from, 1).$from;
        const $to_ = TextSelection.near(findCutAfterHeading($from), -1).$to;
        const range = $fr_.blockRange($to_),
          wrapping = range && findWrapping(range, type, { id: v4() });
        if (!wrapping) {
          return false;
        }
        const tr = state.tr.wrap(range!, wrapping);
        dispatch?.(tr);
        return true;
      }
      // if para
      if ($from.parent.type === state.schema.nodes.paragraph) {
        const range = $from.blockRange($to),
          wrapping = range && findWrapping(range, type, { id: v4() });
        if (!wrapping) {
          return false;
        }
        const tr = state.tr.wrap(range!, wrapping);
        dispatch?.(
          tr.insert(
            tr.selection.$from.after(),
            schema.nodes.paragraph.create({})
          )
        );
        return true;
      }

      return false;
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(state.repeat("+", 3 + height(node)) + "\n");
    state.renderContent(node);
    state.write(state.repeat("+", 3 + height(node)) + "\n");
  }

  parseMarkdown(): ParseSpec | void {
    return {
      block: "container_toggle",
    };
  }

  static isEmpty(toggleBlock: ProsemirrorNode) {
    return (
      ToggleBlock.isHeadEmpty(toggleBlock) &&
      ToggleBlock.isBodyEmpty(toggleBlock)
    );
  }

  static isHeadEmpty(toggleBlock: ProsemirrorNode) {
    return toggleBlock.firstChild!.content.size === 0;
  }

  static isBodyEmpty(toggleBlock: ProsemirrorNode) {
    let empty = true;
    for (let i = 1; i < toggleBlock.childCount; i++) {
      empty &&= !toggleBlock.child(i).content.size;
      if (!empty) {
        break;
      }
    }
    return empty;
  }

  static getUtils(state: EditorState) {
    let body: Fragment;
    const detachBody = (pos: number, tr: Transaction) => {
      const $start = tr.doc.resolve(pos + 1);
      const toggleBlock = tr.doc.nodeAt(pos);

      const posBeforeBody = $start.pos + toggleBlock!.firstChild!.nodeSize;
      const posAfterBody = $start.end();
      body = tr.doc.slice(posBeforeBody, posAfterBody).content;

      return tr.replace(posBeforeBody, posAfterBody, Slice.empty);
    };

    const attachBody = (pos: number, tr: Transaction) => {
      const $start = tr.doc.resolve(pos + 1);
      const toggleBlock = tr.doc.nodeAt(pos);

      const posAfterHead = $start.pos + toggleBlock!.firstChild!.nodeSize;
      return tr.insert(posAfterHead, body);
    };

    const folded = (toggleBlock: ProsemirrorNode) =>
      some(
        ToggleBlock.actionPluginKey
          .getState(state)
          ?.find(
            undefined,
            undefined,
            (spec) =>
              spec.nodeId === toggleBlock!.attrs.id &&
              spec.target === toggleBlock!.type.name &&
              spec.fold === true
          )
      );

    const isToggleBlock = (node: ProsemirrorNode) =>
      node.type === state.schema.nodes.container_toggle;

    const depth = (toggleBlock: ProsemirrorNode) =>
      findIndex(ancestors(state.selection.$from), (node) =>
        node.eq(toggleBlock)
      );

    const isSelectionWithinToggleBlock = () =>
      some(ancestors(state.selection.$from), isToggleBlock);

    const isSelectionWithinToggleBlockHead = () =>
      isSelectionWithinToggleBlock() &&
      state.selection.$from.index(
        depth(nearest(ancestors(state.selection.$from, isToggleBlock))!)
      ) === 0;

    const isSelectionWithinToggleBlockBody = () =>
      isSelectionWithinToggleBlock() && !isSelectionWithinToggleBlockHead();

    const isSelectionAtStartOfToggleBlockHead = () =>
      isSelectionWithinToggleBlockHead() &&
      state.selection.$from.parentOffset === 0;

    const isSelectionInMiddleOfToggleBlockHead = () =>
      isSelectionWithinToggleBlockHead() &&
      state.selection.$from.parentOffset > 0 &&
      state.selection.$from.parentOffset <
        state.selection.$from.node().content.size;

    const isSelectionAtEndOfToggleBlockHead = () =>
      isSelectionWithinToggleBlockHead() &&
      state.selection.$from.parentOffset ===
        state.selection.$from.node().content.size;

    return {
      detachBody,
      attachBody,
      folded,
      depth,
      isToggleBlock,
      isSelectionWithinToggleBlock,
      isSelectionWithinToggleBlockHead,
      isSelectionWithinToggleBlockBody,
      isSelectionAtStartOfToggleBlockHead,
      isSelectionInMiddleOfToggleBlockHead,
      isSelectionAtEndOfToggleBlockHead,
    };
  }
}

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
    this.view.dispatch(
      this.folded
        ? this.view.state.tr
            .setMeta(ToggleBlock.actionPluginKey, {
              type: Action.UNFOLD,
              at: this.getPos(),
            })
            .setMeta(ToggleBlock.eventPluginKey, {
              type: On.UNFOLD,
              at: this.getPos(),
            })
        : this.view.state.tr
            .setMeta(ToggleBlock.actionPluginKey, {
              type: Action.FOLD,
              at: this.getPos(),
            })
            .setMeta(ToggleBlock.eventPluginKey, {
              type: On.FOLD,
              at: this.getPos(),
            })
    );
  }

  destroy() {
    window.removeEventListener("storage", this.broadcastFoldState);
  }
}
