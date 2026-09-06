import { t } from "i18next";
import { chainCommands, newlineInCode } from "prosemirror-commands";
import { wrappingInputRule } from "prosemirror-inputrules";
import type { ParseSpec } from "prosemirror-markdown";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
  Schema,
} from "prosemirror-model";
import type { Command, EditorState, Transaction } from "prosemirror-state";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { findWrapping } from "prosemirror-transform";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 } from "uuid";
import { LRUCache } from "../../utils/LRUCache";
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
import type { NodeWithPos } from "../types";
import { ancestors, height, liftChildrenOfNodeAt } from "../utils";
import { isToggleBlock, getToggleBlockDepth } from "../queries/toggleBlock";
import Node from "./Node";
import { ToggleBlockView } from "./ToggleBlockView";
import { isRemoteTransaction } from "../lib/multiplayer";

export enum Action {
  INIT,
  FOLD,
  UNFOLD,
}

interface FoldAction {
  type: Action;
  /** Position of the target block; omitted to target every toggle block. */
  at?: number;
  /** Whether toggle blocks nested inside the target are included. */
  nested?: boolean;
}

interface ToggleFoldState {
  foldedIds: Set<string>;
  knownIds: Set<string>;
  decorations: DecorationSet;
}

/** Plugin key for toggle block fold state management. */
export const toggleFoldPluginKey = new PluginKey<ToggleFoldState>("toggleFold");

/** Plugin key for toggle block fold/unfold events. */
export const toggleEventPluginKey = new PluginKey("toggleBlockEvent");

/** Build the localStorage key used to persist a toggle block's fold state. */
export const toggleStorageKey = (id: string) => `toggle:${id}`;

/**
 * A bounded cache of fold state per toggle block id, mirrored to local
 * storage. Evicted blocks fall back to the default folded state.
 */
const foldStateCache = new LRUCache<{ fold: boolean }>({
  max: 500,
  namespace: "toggle",
  storage: "localStorage",
});

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
    // Assign IDs and auto-fold empty
    const plugin = new Plugin({
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

        // Assign IDs to blocks that need them and default to unfolded in this browser
        const blocksNeedingIds = toggleBlocks.filter((b) => !b.node.attrs.id);
        if (blocksNeedingIds.length > 0) {
          tr = newState.tr;
          blocksNeedingIds.forEach((block) => {
            const id = v4();
            tr!.setNodeAttribute(block.pos, "id", id);
            foldStateCache.set(id, { fold: false });
          });
        }

        // Auto-fold toggle blocks with empty bodies, only if no structural
        // changes were made (positions would be invalid)
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
        init: (_config, state) => {
          const { foldedIds, knownIds, blocks } = this.collectFoldState(
            state.doc
          );
          return {
            foldedIds,
            knownIds,
            decorations: this.createDecorations(state.doc, foldedIds, blocks),
          };
        },

        apply: (tr, pluginState, _oldState, newState) => {
          if (isRemoteTransaction(tr, newState)) {
            return this.reconcileFoldState(pluginState, newState.doc);
          }

          const action = tr.getMeta(toggleFoldPluginKey);

          // No action - just map decorations through the transaction
          if (!action) {
            if (!tr.docChanged) {
              return pluginState;
            }

            // Always rebuild decorations to ensure head positions are correct
            // (mapping can produce incorrect positions when first child changes)
            return this.reconcileFoldState(pluginState, tr.doc);
          }

          // Handle actions that change fold state
          const newFoldedIds = new Set(pluginState.foldedIds);
          const newKnownIds = new Set(pluginState.knownIds);

          const fold = action.type === Action.FOLD;
          for (const { node } of this.resolveTargets(newState.doc, action)) {
            if (fold) {
              newFoldedIds.add(node.attrs.id);
            } else {
              newFoldedIds.delete(node.attrs.id);
            }
            newKnownIds.add(node.attrs.id);
            foldStateCache.set(node.attrs.id, { fold });
          }

          return {
            foldedIds: newFoldedIds,
            knownIds: newKnownIds,
            decorations: this.createDecorations(
              newState.doc,
              newFoldedIds,
              findBlockNodes(newState.doc, true).filter(
                (b) => b.node.type.name === this.name && b.node.attrs.id
              )
            ),
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
              innerDecorations
            ),
        },
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
          const targets = this.resolveTargets(newState.doc, event);

          if (event.type === Action.FOLD) {
            tr = this.moveSelectionOutOfBody(newState, targets);
          } else if (event.type === Action.UNFOLD) {
            tr = this.insertParagraphIntoEmptyBodies(newState, targets);
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
      plugin,
      foldPlugin,
      eventPlugin,
      new PlaceholderPlugin(
        [
          {
            condition: ({ node, $start, parent }) =>
              parent !== null &&
              parent.type.name === "container_toggle" &&
              $start.index($start.depth - 1) === 0 &&
              node.textContent === "",
            text: `${t("Add title")}…`,
          },
          {
            condition: ({ parent, $start, state }) =>
              parent !== null &&
              parent.type.name === "container_toggle" &&
              $start.index($start.depth - 1) === 1 &&
              ToggleBlock.isBodyEmpty(parent) &&
              (state.selection.$from.pos < $start.pos ||
                state.selection.$from.pos > $start.end($start.depth - 1)),
            text: `${t("Add content")}…`,
          },
          {
            condition: ({ node, parent, $start, state }) =>
              parent !== null &&
              parent.type.name === "container_toggle" &&
              node.isTextblock &&
              node.textContent === "" &&
              (state.selection as TextSelection).$cursor?.pos === $start.pos,
            text: `${t("Type '/' to insert")}…`,
          },
        ],
        ["paragraph", "heading"]
      ),
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
    return (attrs) => (state, dispatch) => {
      const { $from, $to } = state.selection;
      const level =
        attrs &&
        typeof attrs === "object" &&
        "level" in attrs &&
        typeof attrs.level === "number"
          ? attrs.level
          : undefined;

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
        foldStateCache.set(id, { fold: false });
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

        foldStateCache.set(id, { fold: false });
        const tr = state.tr.wrap(range!, wrapping);

        // When a heading level is provided, make the toggle's title a heading
        // rather than a paragraph (a collapsible heading).
        if (level) {
          tr.setNodeMarkup(tr.selection.$from.before(), schema.nodes.heading, {
            level,
          });
        }

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

  /**
   * Resolve the toggle blocks an action applies to: the block at the given
   * position, that block and every toggle block nested inside it when
   * `nested` is set, or every toggle block in the document when no position
   * is given.
   *
   * @param doc The document to look in.
   * @param action The fold action describing the target position and scope.
   * @return The matching toggle blocks with their positions, in document order.
   */
  private resolveTargets(
    doc: ProsemirrorNode,
    action: FoldAction
  ): NodeWithPos[] {
    const isToggle = (b: {
      node: ProsemirrorNode | null;
      pos: number;
    }): b is NodeWithPos =>
      b.node !== null && b.node.type.name === this.name && !!b.node.attrs.id;

    if (action.at === undefined) {
      return findBlockNodes(doc, true).filter(isToggle);
    }

    const at = action.at;
    const root = { node: doc.nodeAt(at), pos: at };
    if (!isToggle(root)) {
      return [];
    }

    if (!action.nested) {
      return [root];
    }

    const descendants = findBlockNodes(root.node, true)
      .map((b) => ({ node: b.node, pos: at + 1 + b.pos }))
      .filter(isToggle);
    return [root, ...descendants];
  }

  /**
   * Move the selection to the end of the title of the outermost target whose
   * body contains it, so that folding does not hide the cursor.
   *
   * @param state The editor state after the fold.
   * @param targets The toggle blocks being folded, in document order.
   * @return A transaction moving the selection, or null if none is needed.
   */
  private moveSelectionOutOfBody(
    state: EditorState,
    targets: NodeWithPos[]
  ): Transaction | null {
    const { $anchor } = state.selection;

    for (const { node, pos } of targets) {
      const startOfNode = pos + 1;
      const endOfFirstChild = startOfNode + node.firstChild!.nodeSize;
      const endOfNode = startOfNode + node.nodeSize - 1;

      if ($anchor.pos > endOfFirstChild && $anchor.pos < endOfNode) {
        return state.tr.setSelection(
          TextSelection.near(state.doc.resolve(endOfFirstChild), -1)
        );
      }
    }

    return null;
  }

  /**
   * Insert an empty paragraph into every target with an empty body so that
   * the placeholder is visible after unfolding.
   *
   * @param state The editor state after the unfold.
   * @param targets The toggle blocks being unfolded, in document order.
   * @return A transaction inserting paragraphs, or null if none is needed.
   */
  private insertParagraphIntoEmptyBodies(
    state: EditorState,
    targets: NodeWithPos[]
  ): Transaction | null {
    const emptyBlocks = targets.filter((b) => b.node.childCount === 1);
    if (emptyBlocks.length === 0) {
      return null;
    }

    const tr = state.tr;
    // Insert from the end so earlier positions stay valid.
    for (const { node, pos } of emptyBlocks.reverse()) {
      tr.insert(
        pos + 1 + node.content.size,
        state.schema.nodes.paragraph.create({})
      );
    }
    return tr;
  }

  /**
   * Collect initial fold state for every toggle block in the document.
   *
   * Used on plugin initialization, where every block is treated as new: the
   * cross-session storage cache is consulted and the default is folded.
   *
   * @param doc The document to scan for toggle blocks.
   * @return The folded and known id sets.
   */
  private collectFoldState(doc: ProsemirrorNode) {
    const foldedIds = new Set<string>();
    const knownIds = new Set<string>();

    const blocks = findBlockNodes(doc, true).filter(
      (b) => b.node.type.name === this.name && b.node.attrs.id
    );

    for (const block of blocks) {
      const id = block.node.attrs.id as string;
      knownIds.add(id);
      const stored = foldStateCache.get(id);
      // Default to folded if no stored state
      if (stored?.fold !== false) {
        foldedIds.add(id);
      }
    }

    return { foldedIds, knownIds, blocks };
  }

  /**
   * Build decorations for toggle blocks from an already-collected set of
   * NodeWithPos records, avoiding a redundant full-document scan.
   *
   * @param doc The document to create decorations against.
   * @param blocks Toggle blocks collected from a prior scan.
   * @param foldedIds The set of ids that are currently folded.
   * @return A decoration set for the toggle blocks.
   */
  private buildDecorationsFromBlocks(
    doc: ProsemirrorNode,
    blocks: NodeWithPos[],
    foldedIds: Set<string>
  ): DecorationSet {
    const decorations: Decoration[] = [];

    for (const block of blocks) {
      const id = block.node.attrs.id as string;
      const isFolded = foldedIds.has(id);

      decorations.push(
        Decoration.node(
          block.pos,
          block.pos + block.node.nodeSize,
          {},
          { nodeId: id, fold: isFolded, target: "container_toggle" }
        ),
        Decoration.node(
          block.pos + 1,
          block.pos + 1 + block.node.firstChild!.nodeSize,
          { nodeName: "div", class: EditorStyleHelper.toggleBlockHead },
          { nodeId: id, target: "container_toggle>:firstChild" }
        )
      );
    }

    return DecorationSet.create(doc, decorations);
  }

  /**
   * Reconcile fold state after the document changes (local or remote edit).
   *
   * Existing fold decisions are always preserved — fold state is only ever
   * initialized for toggle blocks seen here for the first time (id not yet in
   * knownIds). This keeps expanded blocks expanded across collaborative
   * updates even when their fold state could not be persisted to storage.
   *
   * @param pluginState The current fold plugin state.
   * @param doc The updated document.
   * @return The reconciled fold plugin state.
   */
  private reconcileFoldState(
    pluginState: ToggleFoldState,
    doc: ProsemirrorNode
  ): ToggleFoldState {
    const foldedIds = new Set(pluginState.foldedIds);
    const knownIds = new Set(pluginState.knownIds);

    // Collect toggle blocks once; both fold-state reconciliation and
    // decoration building use the same set of toggle blocks.
    const toggleBlocks = findBlockNodes(doc, true).filter(
      (b) => b.node.type.name === this.name && b.node.attrs.id
    );

    for (const block of toggleBlocks) {
      const id = block.node.attrs.id as string;
      if (knownIds.has(id)) {
        continue;
      }
      knownIds.add(id);
      const stored = foldStateCache.get(id);
      // Default to folded if no stored state (new block from sync)
      if (stored?.fold !== false) {
        foldedIds.add(id);
      }
    }

    return {
      foldedIds,
      knownIds,
      decorations: this.buildDecorationsFromBlocks(
        doc,
        toggleBlocks,
        foldedIds
      ),
    };
  }

  /**
   * Build decorations for every toggle block in a document.
   *
   * @param doc The document to scan.
   * @param foldedIds The set of ids that are currently folded.
   * @return A decoration set for the toggle blocks in the document.
   */
  private createDecorations(
    doc: ProsemirrorNode,
    foldedIds: Set<string>,
    blocks?: NodeWithPos[]
  ) {
    const toggleBlocks =
      blocks ??
      findBlockNodes(doc, true).filter(
        (b) => b.node.type.name === this.name && b.node.attrs.id
      );
    return this.buildDecorationsFromBlocks(doc, toggleBlocks, foldedIds);
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
