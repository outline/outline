import copy from "copy-to-clipboard";
import { t } from "i18next";
import type { Token } from "markdown-it";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import type {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import { toast } from "sonner";
import type { Primitive } from "utility-types";
import type { UserPreferences } from "../../types";
import { isBrowser, isMac } from "../../utils/browser";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import {
  newlineInCode,
  indentInCode,
  moveToNextNewline,
  moveToPreviousNewline,
  outdentInCode,
  enterInCode,
  splitCodeBlockOnTripleBackticks,
} from "../commands/codeFence";
import { selectAll } from "../commands/selectAll";
import toggleBlockType from "../commands/toggleBlockType";
import { CodeHighlighting } from "../extensions/CodeHighlighting";
import Mermaid, {
  pluginKey as mermaidPluginKey,
  type MermaidState,
} from "../extensions/Mermaid";
import {
  getRecentlyUsedCodeLanguage,
  setRecentlyUsedCodeLanguage,
} from "../lib/code";
import { isCode, isMermaid } from "../lib/isCode";
import { findBlockNodes } from "../queries/findChildren";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findNextNewline, findPreviousNewline } from "../queries/findNewlines";
import {
  findParentNode,
  findParentNodeClosestToPos,
} from "../queries/findParentNode";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { getMarkRange } from "../queries/getMarkRange";
import { isInCode } from "../queries/isInCode";
import Node from "./Node";

const DEFAULT_LANGUAGE = "javascript";
const COLLAPSE_LINE_THRESHOLD = 12;

interface CollapseState {
  /** Positions of code blocks with more than COLLAPSE_LINE_THRESHOLD lines. */
  tallBlocks: Set<number>;
  /** Positions of code blocks currently collapsed by the user or auto-collapse. */
  collapsedBlocks: Set<number>;
  /** Node decorations that add the `collapsed` CSS class. */
  decorations: DecorationSet;
}

/**
 * Find all code block positions in the document that exceed the line threshold.
 *
 * @param doc - the document to scan.
 * @returns set of positions of tall code blocks.
 */
function findTallBlocks(doc: ProsemirrorNode): Set<number> {
  const tall = new Set<number>();
  for (const block of findBlockNodes(doc, true)) {
    if (isCode(block.node)) {
      const lines = (block.node.textContent.match(/\n/g)?.length ?? 0) + 1;
      if (lines > COLLAPSE_LINE_THRESHOLD) {
        tall.add(block.pos);
      }
    }
  }
  return tall;
}

/**
 * Build a CollapseState with node decorations for the collapsed class and
 * widget decorations for toggle buttons on all tall blocks.
 */
function buildCollapseState(
  doc: ProsemirrorNode,
  tallBlocks: Set<number>,
  collapsedBlocks: Set<number>,
  expandLabel: string,
  collapseLabel: string
): CollapseState {
  const decorations: Decoration[] = [];
  for (const pos of tallBlocks) {
    const node = doc.nodeAt(pos);
    if (!node || !isCode(node)) {
      continue;
    }

    const isCollapsed = collapsedBlocks.has(pos);

    if (isCollapsed) {
      const totalLines = (node.textContent.match(/\n/g)?.length ?? 0) + 1;
      const gutterWidth = String(totalLines).length;
      const lineNumberText = Array.from({ length: totalLines }, (_, i) =>
        String(i + 1).padStart(gutterWidth, " ")
      ).join("\n");

      decorations.push(
        Decoration.node(
          pos,
          pos + node.nodeSize,
          { class: "collapsed", "data-line-numbers": lineNumberText },
          { collapsed: true }
        )
      );
    }

    const label = isCollapsed ? expandLabel : collapseLabel;
    decorations.push(
      Decoration.widget(
        pos + node.nodeSize,
        () => {
          const button = document.createElement("button");
          button.className = EditorStyleHelper.codeBlockToggle;
          button.contentEditable = "false";
          button.type = "button";
          button.textContent = label;
          return button;
        },
        { side: 1, key: `toggle-${pos}-${isCollapsed}` }
      )
    );
  }
  return {
    tallBlocks,
    collapsedBlocks,
    decorations: DecorationSet.create(doc, decorations),
  };
}

/**
 * Options for the CodeFence node.
 */
type CodeFenceOptions = {
  /** Display preferences for the logged in user, if any. */
  userPreferences?: UserPreferences | null;
};

export default class CodeFence extends Node<CodeFenceOptions> {
  /** Plugin key for the collapse state, shared with the command. */
  private static readonly collapseKey = new PluginKey<CollapseState>(
    "collapse-code-block"
  );

  get showLineNumbers(): boolean {
    return this.options.userPreferences?.codeBlockLineNumbers ?? true;
  }

  get name() {
    return "code_fence";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        language: {
          default: DEFAULT_LANGUAGE,
          validate: "string",
        },
        wrap: {
          default: false,
          validate: "boolean",
        },
      },
      content: "text*",
      marks: "comment",
      group: "block",
      code: true,
      defining: true,
      draggable: false,
      parseDOM: [
        {
          tag: `.${EditorStyleHelper.codeBlock}`,
          preserveWhitespace: "full",
          contentElement: (node: HTMLElement) =>
            node.querySelector("code") || node,
          getAttrs: (dom: HTMLDivElement) => ({
            language: dom.dataset.language,
            wrap: dom.classList.contains("with-line-wrap"),
          }),
        },
        {
          tag: "code",
          preserveWhitespace: "full",
          getAttrs: (dom) => {
            // Only parse code blocks that contain newlines for code fences,
            // otherwise the code mark rule will be applied.
            if (!dom.textContent?.includes("\n")) {
              return false;
            }
            return { language: dom.dataset.language };
          },
        },
      ],
      toDOM: (node) => {
        const classes = [
          EditorStyleHelper.codeBlock,
          node.attrs.wrap
            ? "with-line-wrap"
            : this.showLineNumbers
              ? "with-line-numbers"
              : "",
        ]
          .filter(Boolean)
          .join(" ");

        return [
          "div",
          {
            class: classes,
            "data-language": node.attrs.language,
          },
          ["pre", ["code", { spellCheck: "false" }, 0]],
        ];
      },
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      code_block: (attrs: Record<string, Primitive>) => {
        if (attrs?.language) {
          setRecentlyUsedCodeLanguage(attrs.language as string);
        }
        return toggleBlockType(type, schema.nodes.paragraph, {
          language: getRecentlyUsedCodeLanguage() ?? DEFAULT_LANGUAGE,
          ...attrs,
        });
      },
      toggleCodeBlockCollapse: (): Command => (state, dispatch) => {
        const codeBlock = findParentNode(isCode)(state.selection);
        if (!codeBlock) {
          return false;
        }

        if (dispatch) {
          dispatch(
            state.tr
              .setMeta(CodeFence.collapseKey, {
                toggle: codeBlock.pos,
              })
              .setMeta("addToHistory", false)
          );
        }
        return true;
      },
      toggleCodeBlockWrap: (): Command => (state, dispatch) => {
        const codeBlock = findParentNode(isCode)(state.selection);
        if (!codeBlock) {
          return false;
        }

        if (dispatch) {
          dispatch(
            state.tr.setNodeMarkup(codeBlock.pos, undefined, {
              ...codeBlock.node.attrs,
              wrap: !codeBlock.node.attrs.wrap,
            })
          );
        }
        return true;
      },
      edit_mermaid: (): Command => (state, dispatch) => {
        const codeBlock =
          state.selection instanceof NodeSelection &&
          isCode(state.selection.node)
            ? { pos: state.selection.from, node: state.selection.node }
            : findParentNode(isCode)(state.selection);
        if (!codeBlock || !isMermaid(codeBlock.node)) {
          return false;
        }

        const mermaidState = mermaidPluginKey.getState(state) as MermaidState;
        const decorations = mermaidState?.decorationSet.find(
          codeBlock.pos,
          codeBlock.pos + codeBlock.node.nodeSize
        );
        const nodeDecoration = decorations?.find(
          (d) => d.spec.diagramId && d.from === codeBlock.pos
        );
        const diagramId = nodeDecoration?.spec.diagramId;

        if (dispatch && diagramId) {
          dispatch(
            state.tr
              .setMeta(mermaidPluginKey, {
                editingId:
                  mermaidState?.editingId === diagramId ? undefined : diagramId,
              })
              .setSelection(TextSelection.create(state.doc, codeBlock.pos + 1))
              .scrollIntoView()
          );
        }
        return true;
      },
      copyToClipboard: (): Command => (state, dispatch) => {
        const codeBlock = findParentNode(isCode)(state.selection);

        if (codeBlock) {
          copy(codeBlock.node.textContent);
          toast.message(t("Copied to clipboard"));
          return true;
        }

        const { doc, tr } = state;
        const range =
          getMarkRange(
            doc.resolve(state.selection.from),
            this.editor.schema.marks.code_inline
          ) ||
          getMarkRange(
            doc.resolve(state.selection.to),
            this.editor.schema.marks.code_inline
          );

        if (range) {
          const $end = doc.resolve(range.to);
          tr.setSelection(new TextSelection($end, $end));
          dispatch?.(tr);

          copy(tr.doc.textBetween(state.selection.from, state.selection.to));
          toast.message(t("Copied to clipboard"));
          return true;
        }

        return false;
      },
    };
  }

  get allowInReadOnly() {
    return true;
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    const output: Record<string, Command> = {
      // Both shortcuts work, but Shift-Ctrl-c matches the one in the menu
      "Shift-Ctrl-c": toggleBlockType(type, schema.nodes.paragraph),
      "Shift-Ctrl-\\": toggleBlockType(type, schema.nodes.paragraph),
      "Shift-Tab": outdentInCode,
      Tab: indentInCode,
      Enter: enterInCode,
      Backspace: backspaceToParagraph(type),
      "Shift-Enter": newlineInCode,
      "Mod-a": selectAll(type),
      "Mod-]": indentInCode,
      "Mod-[": outdentInCode,
    };

    if (isMac) {
      return {
        ...output,
        "Ctrl-a": moveToPreviousNewline,
        "Ctrl-e": moveToNextNewline,
      };
    }

    return output;
  }

  /** Plugins for collapsible code block behavior. */
  private collapsePlugins(): Plugin[] {
    const collapseKey = CodeFence.collapseKey;
    const build = (
      doc: ProsemirrorNode,
      tall: Set<number>,
      collapsed: Set<number>
    ) => buildCollapseState(doc, tall, collapsed, t("Expand"), t("Collapse"));

    return [
      // Main collapse plugin: manages state and decorations
      new Plugin<CollapseState>({
        key: collapseKey,
        state: {
          init: (_config, state) => {
            if (!isBrowser) {
              return {
                tallBlocks: new Set<number>(),
                collapsedBlocks: new Set<number>(),
                decorations: DecorationSet.empty,
              };
            }
            const tallBlocks = findTallBlocks(state.doc);
            return build(state.doc, tallBlocks, new Set(tallBlocks));
          },
          apply: (tr, prev, _oldState, newState) => {
            const meta = tr.getMeta(collapseKey);

            // Toggle collapsed state
            if (meta?.toggle !== undefined) {
              const next = new Set(prev.collapsedBlocks);
              if (next.has(meta.toggle)) {
                next.delete(meta.toggle);
              } else {
                next.add(meta.toggle);
              }
              return build(newState.doc, prev.tallBlocks, next);
            }

            // Expand a specific block (auto-expand on focus)
            if (meta?.expand !== undefined) {
              if (prev.collapsedBlocks.has(meta.expand)) {
                const next = new Set(prev.collapsedBlocks);
                next.delete(meta.expand);
                return build(newState.doc, prev.tallBlocks, next);
              }
              return prev;
            }

            // Recompute tall blocks on doc changes, preserving
            // user collapse/expand choices where possible.
            if (tr.docChanged) {
              const tallBlocks = findTallBlocks(newState.doc);
              const collapsedBlocks = new Set<number>();

              const inverse = tr.mapping.invert();
              for (const pos of tallBlocks) {
                const oldPos = inverse.map(pos);
                if (!prev.tallBlocks.has(oldPos)) {
                  // Newly tall blocks start collapsed
                  collapsedBlocks.add(pos);
                } else if (prev.collapsedBlocks.has(oldPos)) {
                  // Preserve previous collapsed state
                  collapsedBlocks.add(pos);
                }
              }

              return build(newState.doc, tallBlocks, collapsedBlocks);
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
      // Click handler for toggle button + auto-expand on focus
      new Plugin({
        key: new PluginKey("collapse-toggle"),
        appendTransaction: (transactions, _oldState, newState) => {
          const hasCollapseMeta = transactions.some((tr) =>
            tr.getMeta(collapseKey)
          );
          const hasSelectionSet = transactions.some((tr) => tr.selectionSet);
          if (hasCollapseMeta || !hasSelectionSet) {
            return null;
          }

          const codeBlock = findParentNode(isCode)(newState.selection);
          const collapseState = collapseKey.getState(newState);
          if (
            !codeBlock ||
            !collapseState?.collapsedBlocks.has(codeBlock.pos)
          ) {
            return null;
          }

          return newState.tr
            .setMeta(collapseKey, { expand: codeBlock.pos })
            .setMeta("addToHistory", false);
        },
        props: {
          handleDOMEvents: {
            mousedown: (view: EditorView, event: MouseEvent) => {
              const target = event.target as HTMLElement;
              const button = target.closest(
                `.${EditorStyleHelper.codeBlockToggle}`
              );
              if (!button) {
                return false;
              }

              const codeBlockEl =
                button.previousElementSibling?.classList.contains(
                  EditorStyleHelper.codeBlock
                )
                  ? button.previousElementSibling
                  : null;
              if (!codeBlockEl) {
                return false;
              }

              const codeEl = codeBlockEl.querySelector("code");
              if (!codeEl) {
                return false;
              }

              const pos = view.posAtDOM(codeEl, 0);
              const $pos = view.state.doc.resolve(pos);
              const parent = findParentNodeClosestToPos($pos, isCode);
              if (!parent) {
                return false;
              }

              const collapseState = collapseKey.getState(view.state);
              const isCollapsing = !collapseState?.collapsedBlocks.has(
                parent.pos
              );

              view.dispatch(
                view.state.tr
                  .setMeta(collapseKey, { toggle: parent.pos })
                  .setMeta("addToHistory", false)
              );

              if (isCollapsing) {
                codeBlockEl.scrollIntoView({ block: "nearest" });
              }

              event.preventDefault();
              event.stopPropagation();
              return true;
            },
          },
        },
      }),
    ];
  }

  get plugins() {
    const createActiveCodeBlockDecoration = (state: EditorState) => {
      const codeBlock = findParentNode(isCode)(state.selection);
      if (!codeBlock) {
        return DecorationSet.empty;
      }

      if (isMermaid(codeBlock.node)) {
        const mermaidState = mermaidPluginKey.getState(state) as MermaidState;
        const decorations = mermaidState?.decorationSet.find(
          codeBlock.pos,
          codeBlock.pos + codeBlock.node.nodeSize
        );
        const nodeDecoration = decorations?.find(
          (d) => d.spec.diagramId && d.from === codeBlock.pos
        );
        const diagramId = nodeDecoration?.spec.diagramId;

        if (!diagramId || mermaidState?.editingId !== diagramId) {
          return DecorationSet.empty;
        }
      }

      const decoration = Decoration.node(
        codeBlock.pos,
        codeBlock.pos + codeBlock.node.nodeSize,
        { class: "code-active" }
      );
      return DecorationSet.create(state.doc, [decoration]);
    };

    return [
      CodeHighlighting({
        name: this.name,
        lineNumbers: this.showLineNumbers,
      }),
      this.name === "code_fence"
        ? Mermaid({
            isDark: this.editor.props.theme.isDark,
            editor: this.editor,
          })
        : undefined,
      new Plugin({
        key: new PluginKey("code-fence-split"),
        props: {
          handleTextInput: (view, _from, _to, text) => {
            if (text === "`") {
              const { state, dispatch } = view;
              return splitCodeBlockOnTripleBackticks(state, dispatch);
            }
            return false;
          },
        },
      }),
      new Plugin({
        key: new PluginKey("triple-click"),
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              const { dispatch, state } = view;
              const {
                selection: { $from, $to },
              } = state;
              if (
                $from.sameParent($to) &&
                event.detail === 3 &&
                isInCode(view.state, { onlyBlock: true })
              ) {
                dispatch?.(
                  state.tr
                    .setSelection(
                      TextSelection.create(
                        state.doc,
                        findPreviousNewline($from),
                        findNextNewline($from)
                      )
                    )
                    .scrollIntoView()
                );

                event.preventDefault();
                return true;
              }

              return false;
            },
          },
        },
      }),
      new Plugin({
        key: new PluginKey("code-fence-active"),
        state: {
          init: (_, state) => createActiveCodeBlockDecoration(state),
          apply: (tr, pluginState, oldState, newState) => {
            // Only recompute if selection or document changed
            if (
              !tr.selectionSet &&
              !tr.docChanged &&
              !tr.getMeta(mermaidPluginKey)
            ) {
              return pluginState;
            }

            return createActiveCodeBlockDecoration(newState);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
      // Collapse plugins - only on code_fence (not CodeBlock subclass)
      ...(this.name === "code_fence" ? this.collapsePlugins() : []),
    ].filter(Boolean) as Plugin[];
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      textblockTypeInputRule(/^```$/, type, () => ({
        language: getRecentlyUsedCodeLanguage() ?? DEFAULT_LANGUAGE,
      })),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("```" + (node.attrs.language || "") + "\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  }

  get markdownToken() {
    return "fence";
  }

  parseMarkdown() {
    return {
      block: "code_block",
      getAttrs: (tok: Token) => ({ language: tok.info }),
      noCloseToken: true,
    };
  }
}
