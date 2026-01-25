import { chainCommands, newlineInCode } from "prosemirror-commands";
import { wrappingInputRule } from "prosemirror-inputrules";
import type { ParseSpec } from "prosemirror-markdown";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
  Schema,
} from "prosemirror-model";
import type { Command, Transaction } from "prosemirror-state";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { findWrapping } from "prosemirror-transform";
import type { DecorationSource, EditorView, NodeView } from "prosemirror-view";
import { Decoration, DecorationSet } from "prosemirror-view";
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
import type { CommandFactory } from "../lib/Extension";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { PlaceholderPlugin } from "../plugins/PlaceholderPlugin";
import { findBlockNodes } from "../queries/findChildren";
import { findCutAfterHeading } from "../queries/findCutAfterHeading";
import { isNodeActive } from "../queries/isNodeActive";
import toggleBlocksRule from "../rules/toggleBlocks";
import { ancestors, height, liftChildrenOfNodeAt } from "../utils";
import { isToggleBlock, getToggleBlockDepth } from "../queries/toggleBlock";
import Node from "./Node";

export enum Action {
  INIT,
  FOLD,
  UNFOLD,
}

interface ToggleFoldState {
  foldedIds: Set<string>;
  decorations: DecorationSet;
}

/**
 * Build decorations for all toggle blocks based on fold state.
 *
 * @param doc - the document to build decorations for.
 * @param foldedIds - set of folded toggle block IDs.
 * @returns decoration set for all toggle blocks.
 */
function buildDecorations(
  doc: ProsemirrorNode,
  foldedIds: Set<string>
): DecorationSet {
  const decorations: Decoration[] = [];

  findBlockNodes(doc, true)
    .filter((b) => b.node.type.name === "container_toggle" && b.node.attrs.id)
    .forEach((block) => {
      const id = block.node.attrs.id as string;
      const isFolded = foldedIds.has(id);

      // Decoration on the toggle block itself (for fold state)
      decorations.push(
        Decoration.node(
          block.pos,
          block.pos + block.node.nodeSize,
          {},
          { nodeId: id, fold: isFolded, target: "container_toggle" }
        )
      );

      // Decoration on the head (first child) for styling
      decorations.push(
        Decoration.node(
          block.pos + 1,
          block.pos + 1 + block.node.firstChild!.nodeSize,
          { nodeName: "div", class: "toggle-block-head" },
          { nodeId: id, target: "container_toggle>:firstChild" }
        )
      );
    });

  return DecorationSet.create(doc, decorations);
}

export default class ToggleBlock extends Node {
  static actionPluginKey = new PluginKey<ToggleFoldState>("toggleFold");

  static eventPluginKey = new PluginKey("toggleBlockEvent");

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
    const userId = this.editor.props.userId;

    // Plugin 1: Fix toggle blocks - assign IDs, fix positions, auto-fold empty
    const fixToggleBlocksPlugin = new Plugin({
      appendTransaction: (transactions, _oldState, newState) => {
        if (!transactions.some((tr) => tr.docChanged)) {
          return null;
        }

        // Single pass to find all toggle blocks
        const toggleBlocks = findBlockNodes(newState.doc, true).filter(
          (b) => b.node.type.name === this.name
        );

        if (toggleBlocks.length === 0) {
          return null;
        }

        let tr: Transaction | null = null;

        // 1. Assign IDs to blocks that need them
        const blocksNeedingIds = toggleBlocks.filter((b) => !b.node.attrs.id);
        if (blocksNeedingIds.length > 0) {
          tr = newState.tr;
          blocksNeedingIds.forEach((block) => {
            tr!.setNodeAttribute(block.pos, "id", v4());
          });
        }

        // 2. Fix invalid positions (toggle at start of list item)
        // Use the updated doc if we made changes, process in reverse order
        const doc = tr?.doc ?? newState.doc;
        const currentBlocks = tr
          ? findBlockNodes(doc, true).filter(
              (b) => b.node.type.name === this.name
            )
          : toggleBlocks;

        const invalidBlocks = currentBlocks.filter((block) => {
          const $pos = doc.resolve(block.pos);
          return (
            $pos.parent.type === newState.schema.nodes.list_item &&
            $pos.parentOffset === 0
          );
        });

        if (invalidBlocks.length > 0) {
          tr = tr ?? newState.tr;
          for (let i = invalidBlocks.length - 1; i >= 0; i--) {
            tr.insert(
              invalidBlocks[i].pos,
              newState.schema.nodes.paragraph.create({})
            );
          }
        }

        // 3. Auto-fold toggle blocks with empty bodies
        // Only if no structural changes were made (positions would be invalid)
        if (!tr) {
          const pluginState = ToggleBlock.actionPluginKey.getState(newState);
          if (pluginState) {
            const emptyBodyBlock = toggleBlocks.find(
              (b) =>
                b.node.childCount === 1 &&
                b.node.attrs.id &&
                !pluginState.foldedIds.has(b.node.attrs.id)
            );

            if (emptyBodyBlock) {
              return newState.tr.setMeta(ToggleBlock.actionPluginKey, {
                type: Action.FOLD,
                at: emptyBodyBlock.pos,
              });
            }
          }
        }

        return tr;
      },
    });

    // Plugin 2: Main fold state management
    const foldPlugin = new Plugin<ToggleFoldState>({
      key: ToggleBlock.actionPluginKey,

      state: {
        init: () => ({
          foldedIds: new Set<string>(),
          decorations: DecorationSet.empty,
        }),

        apply: (tr, pluginState, _oldState, newState) => {
          const action = tr.getMeta(ToggleBlock.actionPluginKey);

          // No action - just map decorations through the transaction
          if (!action) {
            if (!tr.docChanged) {
              return pluginState;
            }

            // Map existing decorations and rebuild to handle any structural changes
            const mapped = pluginState.decorations.map(tr.mapping, tr.doc);

            // Check if any toggle blocks were added/removed by comparing counts
            const currentBlocks = findBlockNodes(tr.doc, true).filter(
              (b) => b.node.type.name === this.name && b.node.attrs.id
            );
            const decoratedBlocks = mapped.find(
              undefined,
              undefined,
              (spec) => spec.target === "container_toggle"
            );

            // If counts differ, rebuild decorations
            if (currentBlocks.length !== decoratedBlocks.length) {
              return {
                foldedIds: pluginState.foldedIds,
                decorations: buildDecorations(tr.doc, pluginState.foldedIds),
              };
            }

            return {
              foldedIds: pluginState.foldedIds,
              decorations: mapped,
            };
          }

          // Handle actions that change fold state
          const newFoldedIds = new Set(pluginState.foldedIds);

          switch (action.type) {
            case Action.INIT: {
              // Initialize fold states from Storage for all toggle blocks
              findBlockNodes(newState.doc, true)
                .filter(
                  (b) => b.node.type.name === this.name && b.node.attrs.id
                )
                .forEach((block) => {
                  const id = block.node.attrs.id as string;
                  const stored = Storage.get(`${id}:${userId}`);
                  // Default to folded if no stored state
                  if (stored?.fold !== false) {
                    newFoldedIds.add(id);
                  }
                  // Ensure storage has a value
                  if (stored === null || stored === undefined) {
                    Storage.set(`${id}:${userId}`, { fold: true });
                  }
                });
              break;
            }

            case Action.FOLD: {
              const node = newState.doc.nodeAt(action.at);
              if (node?.attrs.id) {
                newFoldedIds.add(node.attrs.id);
                Storage.set(`${node.attrs.id}:${userId}`, { fold: true });
              }
              break;
            }

            case Action.UNFOLD: {
              const node = newState.doc.nodeAt(action.at);
              if (node?.attrs.id) {
                newFoldedIds.delete(node.attrs.id);
                Storage.set(`${node.attrs.id}:${userId}`, { fold: false });
              }
              break;
            }
          }

          return {
            foldedIds: newFoldedIds,
            decorations: buildDecorations(newState.doc, newFoldedIds),
          };
        },
      },

      props: {
        decorations: (state) =>
          ToggleBlock.actionPluginKey.getState(state)?.decorations,
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

    // Plugin 3: Initialize fold state on document load
    const initPlugin = new Plugin({
      view: () => {
        let initialized = false;
        return {
          update: (view, prevState) => {
            // Initialize on first update with content, or when doc changes significantly
            const hasContent = view.state.doc.content.size > 2;
            const isMultiplayer = this.editor.props.extensions?.some(
              (e: { name: string }) => e.name === "multiplayer"
            );

            if (!initialized && hasContent) {
              // For multiplayer, wait for first docChanged
              if (isMultiplayer && prevState.doc.content.size <= 2) {
                view.dispatch(
                  view.state.tr.setMeta(ToggleBlock.actionPluginKey, {
                    type: Action.INIT,
                  })
                );
                initialized = true;
              } else if (!isMultiplayer) {
                view.dispatch(
                  view.state.tr.setMeta(ToggleBlock.actionPluginKey, {
                    type: Action.INIT,
                  })
                );
                initialized = true;
              }
            }
          },
        };
      },
    });

    // Plugin 4: Handle fold/unfold side effects (cursor management, empty body handling)
    const eventPlugin = new Plugin({
      key: ToggleBlock.eventPluginKey,

      appendTransaction: (transactions, _oldState, newState) => {
        const eventTr = transactions.find((tr) =>
          tr.getMeta(ToggleBlock.eventPluginKey)
        );

        let tr: Transaction | null = null;

        if (eventTr) {
          const event = eventTr.getMeta(ToggleBlock.eventPluginKey);
          const node = newState.doc.nodeAt(event.at);

          if (node) {
            if (event.type === Action.FOLD) {
              // Move cursor out of body if folding
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
            } else if (event.type === Action.UNFOLD) {
              // Insert empty paragraph if body is empty (for placeholder visibility)
              if (node.childCount === 1) {
                tr = newState.tr.insert(
                  event.at + 1 + node.content.size,
                  newState.schema.nodes.paragraph.create({})
                );
              }
            }
          }
        }

        // Auto-unfold if cursor is in body of folded toggle
        const { $from } = newState.selection;
        const pluginState = ToggleBlock.actionPluginKey.getState(newState);
        const isToggle = isToggleBlock(newState);

        if (pluginState) {
          const toggleBlockAncestor = ancestors($from).find(
            (node) => isToggle(node) && pluginState.foldedIds.has(node.attrs.id)
          );

          if (toggleBlockAncestor) {
            const d = getToggleBlockDepth($from, toggleBlockAncestor);
            const posAfterHead =
              $from.start(d) + toggleBlockAncestor.firstChild!.nodeSize;
            const posAtEnd = $from.end(d);

            if ($from.pos > posAfterHead && $from.pos < posAtEnd) {
              tr = (tr ?? newState.tr).setMeta(ToggleBlock.actionPluginKey, {
                type: Action.UNFOLD,
                at: $from.before(d),
              });
            }
          }
        }

        return tr;
      },
    });

    return [
      fixToggleBlocksPlugin,
      foldPlugin,
      initPlugin,
      eventPlugin,
      new PlaceholderPlugin([
        {
          condition: ({ node, $start, parent }) =>
            parent !== null &&
            parent.type.name === "container_toggle" &&
            $start.index($start.depth - 1) === 0 &&
            node.textContent === "",
          text: this.options.dictionary?.emptyToggleBlockHead,
        },
        {
          condition: ({ parent, $start, state }) =>
            parent !== null &&
            parent.type.name === "container_toggle" &&
            $start.index($start.depth - 1) === 1 &&
            ToggleBlock.isBodyEmpty(parent) &&
            (state.selection.$from.pos < $start.pos ||
              state.selection.$from.pos > $start.end($start.depth - 1)),
          text: this.options.dictionary?.emptyToggleBlockBody,
        },
        {
          condition: ({ node, parent, $start, state }) =>
            parent !== null &&
            parent.type.name === "container_toggle" &&
            node.isTextblock &&
            node.textContent === "" &&
            (state.selection as TextSelection).$cursor?.pos === $start.pos,
          text: this.options.dictionary?.emptyTextBlockWithinToggleBlock,
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
        const id = v4();
        const range = $fr_.blockRange($to_),
          wrapping = range && findWrapping(range, type, { id });
        if (!wrapping) {
          return false;
        }
        Storage.set(`${id}:${this.editor.props.userId}`, { fold: false });
        const tr = state.tr.wrap(range!, wrapping);
        dispatch?.(tr);
        return true;
      }
      // if para
      if ($from.parent.type === state.schema.nodes.paragraph) {
        const id = v4();
        const range = $from.blockRange($to),
          wrapping = range && findWrapping(range, type, { id });
        if (!wrapping) {
          return false;
        }

        Storage.set(`${id}:${this.editor.props.userId}`, { fold: false });
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
    for (let i = 1; i < toggleBlock.childCount; i++) {
      if (toggleBlock.child(i).content.size > 0) {
        return false;
      }
    }
    return true;
  }
}

class ToggleBlockView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLDivElement;
  private button: HTMLButtonElement;
  private node: ProsemirrorNode;
  private view: EditorView;
  private getPos: () => number | undefined;
  private editorProps: Record<string, unknown>;
  private boundBroadcastFoldState: (event: StorageEvent) => void;

  constructor(
    node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
    decorations: readonly Decoration[],
    _innerDecorations: DecorationSource,
    editorProps: Record<string, unknown>
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.editorProps = editorProps;

    // Create DOM structure
    this.dom = document.createElement("div");
    this.dom.className = "toggle-block";

    this.button = document.createElement("button");
    this.button.className = "toggle-block-button";
    this.button.contentEditable = "false";
    this.button.innerHTML =
      '<svg fill="currentColor" width="12" height="24" viewBox="6 0 12 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.23823905,10.6097108 L11.207376,14.4695888 L11.207376,14.4695888 C11.54411,14.907343 12.1719566,14.989236 12.6097108,14.652502 C12.6783439,14.5997073 12.7398293,14.538222 12.792624,14.4695888 L15.761761,10.6097108 L15.761761,10.6097108 C16.0984949,10.1719566 16.0166019,9.54410997 15.5788477,9.20737601 C15.4040391,9.07290785 15.1896811,9 14.969137,9 L9.03086304,9 L9.03086304,9 C8.47857829,9 8.03086304,9.44771525 8.03086304,10 C8.03086304,10.2205442 8.10377089,10.4349022 8.23823905,10.6097108 Z" /></svg>';
    this.button.addEventListener("mousedown", this.handleToggle);

    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "toggle-block-content";

    this.dom.appendChild(this.button);
    this.dom.appendChild(this.contentDOM);

    // Set initial fold state from decorations
    this.syncFoldState(decorations);

    // Listen for cross-tab storage changes
    this.boundBroadcastFoldState = this.broadcastFoldState.bind(this);
    window.addEventListener("storage", this.boundBroadcastFoldState);
  }

  private handleToggle = (event: MouseEvent) => {
    event.preventDefault();
    if (event.button !== 0) {
      return;
    }

    const pos = this.getPos();
    if (pos === undefined) {
      return;
    }

    const isFolded = this.dom.classList.contains("folded");

    this.view.dispatch(
      this.view.state.tr
        .setMeta(ToggleBlock.actionPluginKey, {
          type: isFolded ? Action.UNFOLD : Action.FOLD,
          at: pos,
        })
        .setMeta(ToggleBlock.eventPluginKey, {
          type: isFolded ? Action.UNFOLD : Action.FOLD,
          at: pos,
        })
    );
  };

  private broadcastFoldState(event: StorageEvent) {
    const key = `${this.node.attrs.id}:${this.editorProps.userId}`;
    if (event.key !== key || !event.newValue || !event.oldValue) {
      return;
    }

    const newFoldState = JSON.parse(event.newValue);
    const oldFoldState = JSON.parse(event.oldValue);

    if (newFoldState.fold !== oldFoldState.fold) {
      const pos = this.getPos();
      if (pos === undefined) {
        return;
      }

      this.view.dispatch(
        this.view.state.tr
          .setMeta(ToggleBlock.actionPluginKey, {
            type: newFoldState.fold ? Action.FOLD : Action.UNFOLD,
            at: pos,
          })
          .setMeta(ToggleBlock.eventPluginKey, {
            type: newFoldState.fold ? Action.FOLD : Action.UNFOLD,
            at: pos,
          })
      );
    }
  }

  private syncFoldState(decorations: readonly Decoration[]) {
    const isFolded = decorations.some((d) => d.spec.fold === true);
    this.dom.classList.toggle("folded", isFolded);
  }

  update(node: ProsemirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }
    this.node = node;
    this.syncFoldState(decorations);
    return true;
  }

  destroy() {
    this.button.removeEventListener("mousedown", this.handleToggle);
    window.removeEventListener("storage", this.boundBroadcastFoldState);
  }
}
