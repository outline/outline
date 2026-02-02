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
  exitToggleBlockOnEmptyParagraph,
} from "../commands/toggleBlock";
import type { CommandFactory } from "../lib/Extension";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { PlaceholderPlugin } from "../plugins/PlaceholderPlugin";
import { findBlockNodes } from "../queries/findChildren";
import { findCutAfterHeading } from "../queries/findCutAfterHeading";
import { isNodeActive } from "../queries/isNodeActive";
import toggleBlocksRule from "../rules/toggleBlocks";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { ancestors, height, liftChildrenOfNodeAt } from "../utils";
import { isToggleBlock, getToggleBlockDepth } from "../queries/toggleBlock";
import Node from "./Node";
import { ToggleBlockView } from "./ToggleBlockView";

export enum Action {
  INIT,
  FOLD,
  UNFOLD,
}

interface ToggleFoldState {
  foldedIds: Set<string>;
  decorations: DecorationSet;
}

/** Plugin key for toggle block fold state management. */
export const toggleFoldPluginKey = new PluginKey<ToggleFoldState>("toggleFold");

/** Plugin key for toggle block fold/unfold events. */
export const toggleEventPluginKey = new PluginKey("toggleBlockEvent");

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
          { nodeName: "div", class: EditorStyleHelper.toggleBlockHead },
          { nodeId: id, target: "container_toggle>:firstChild" }
        )
      );
    });

  return DecorationSet.create(doc, decorations);
}

export default class ToggleBlock extends Node {
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
      parseDOM: [
        {
          tag: "div[data-type='container_toggle']",
          preserveWhitespace: "full",
        },
        {
          tag: `div.${EditorStyleHelper.toggleBlock}`,
          preserveWhitespace: "full",
        },
      ],
      toDOM: () => [
        "div",
        { class: EditorStyleHelper.toggleBlock },
        ["div", { class: EditorStyleHelper.toggleBlockContent }, 0],
      ],
    };
  }

  get plugins() {
    const userId = this.editor.props.userId;

    // Assign IDs, fix positions, auto-fold empty
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

        // 1. Assign IDs to blocks that need them and set fold state for creator
        const blocksNeedingIds = toggleBlocks.filter((b) => !b.node.attrs.id);
        if (blocksNeedingIds.length > 0) {
          tr = newState.tr;
          blocksNeedingIds.forEach((block) => {
            const id = v4();
            tr!.setNodeAttribute(block.pos, "id", id);
            // Set unfolded for the user who created the toggle
            Storage.set(`${id}:${userId}`, { fold: false });
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
          const pluginState = toggleFoldPluginKey.getState(newState);
          if (pluginState) {
            const emptyBodyBlock = toggleBlocks.find(
              (b) =>
                b.node.childCount === 1 &&
                b.node.attrs.id &&
                !pluginState.foldedIds.has(b.node.attrs.id)
            );

            if (emptyBodyBlock) {
              return newState.tr.setMeta(toggleFoldPluginKey, {
                type: Action.FOLD,
                at: emptyBodyBlock.pos,
              });
            }
          }
        }

        return tr;
      },
    });

    // Main fold state management
    const foldPlugin = new Plugin<ToggleFoldState>({
      key: toggleFoldPluginKey,

      state: {
        init: () => ({
          foldedIds: new Set<string>(),
          decorations: DecorationSet.empty,
        }),

        apply: (tr, pluginState, _oldState, newState) => {
          const action = tr.getMeta(toggleFoldPluginKey);

          // No action - just map decorations through the transaction
          if (!action) {
            if (!tr.docChanged) {
              return pluginState;
            }

            // Check if any toggle blocks were added and need fold state
            const currentBlocks = findBlockNodes(tr.doc, true).filter(
              (b) => b.node.type.name === this.name && b.node.attrs.id
            );

            const newFoldedIds = new Set(pluginState.foldedIds);

            // For any new blocks, check storage and default to folded
            currentBlocks.forEach((block) => {
              const id = block.node.attrs.id as string;
              if (!pluginState.foldedIds.has(id)) {
                const stored = Storage.get(`${id}:${userId}`);
                // Default to folded if no stored state (new block from sync)
                if (stored?.fold !== false) {
                  newFoldedIds.add(id);
                }
              }
            });

            // Always rebuild decorations to ensure head positions are correct
            // (mapping can produce incorrect positions when first child changes)
            return {
              foldedIds: newFoldedIds,
              decorations: buildDecorations(tr.doc, newFoldedIds),
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
          toggleFoldPluginKey.getState(state)?.decorations,
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

    // Initialize fold state on document load
    const initPlugin = new Plugin({
      view: () => {
        let initialized = false;
        return {
          update: (view, prevState) => {
            if (initialized) {
              return;
            }

            const hasContent = view.state.doc.content.size > 2;
            if (!hasContent) {
              return;
            }

            const isMultiplayer = this.editor.props.extensions?.some(
              (e: { name: string }) => e.name === "multiplayer"
            );

            // For multiplayer, wait for first real content load
            if (isMultiplayer && prevState.doc.content.size > 2) {
              return;
            }

            // Set flag before dispatch to prevent re-entry
            initialized = true;
            view.dispatch(
              view.state.tr.setMeta(toggleFoldPluginKey, {
                type: Action.INIT,
              })
            );
          },
        };
      },
    });

    // Handle fold/unfold side effects (cursor management, empty body handling)
    const eventPlugin = new Plugin({
      key: toggleEventPluginKey,

      appendTransaction: (transactions, _oldState, newState) => {
        const eventTr = transactions.find((tr) =>
          tr.getMeta(toggleEventPluginKey)
        );

        let tr: Transaction | null = null;

        if (eventTr) {
          const event = eventTr.getMeta(toggleEventPluginKey);
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
        // Skip if we're handling a fold event (cursor will be moved out of body)
        const isFoldEvent =
          eventTr?.getMeta(toggleEventPluginKey)?.type === Action.FOLD;

        if (!isFoldEvent) {
          const { $from } = newState.selection;
          const pluginState = toggleFoldPluginKey.getState(newState);
          const isToggle = isToggleBlock(newState);

          if (pluginState) {
            const toggleBlockAncestor = ancestors($from).find(
              (node) =>
                isToggle(node) && pluginState.foldedIds.has(node.attrs.id)
            );

            if (toggleBlockAncestor) {
              const d = getToggleBlockDepth($from, toggleBlockAncestor);
              const posAfterHead =
                $from.start(d) + toggleBlockAncestor.firstChild!.nodeSize;
              const posAtEnd = $from.end(d);

              if ($from.pos > posAfterHead && $from.pos < posAtEnd) {
                tr = (tr ?? newState.tr).setMeta(toggleFoldPluginKey, {
                  type: Action.UNFOLD,
                  at: $from.before(d),
                });
              }
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
          text: this.options.dictionary?.newLineEmpty,
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
        exitToggleBlockOnEmptyParagraph,
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
