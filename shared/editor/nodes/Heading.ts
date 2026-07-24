import copy from "copy-to-clipboard";
import { t } from "i18next";
import type Token from "markdown-it/lib/token.mjs";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import type {
  Node as ProsemirrorNode,
  NodeSpec,
  NodeType,
  Schema,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { Plugin, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Primitive } from "utility-types";
import { isSafari } from "../../utils/browser";
import { removeUrlFragment, removeUrlPathSuffix } from "../../utils/urls";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import toggleBlockType from "../commands/toggleBlockType";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

export enum HeadingLevel {
  One = 1,
  Two,
  Three,
  Four,
}

/**
 * Options for the Heading node.
 */
type HeadingOptions = {
  /** Heading levels (1-based) that are enabled in this editor. */
  levels: number[];
  /** Offset added to the rendered heading level (e.g. 1 renders an `h2` for level 1). */
  offset?: number;
};

export default class Heading extends Node<HeadingOptions> {
  get name() {
    return "heading";
  }

  get defaultOptions(): Partial<HeadingOptions> {
    return {
      levels: [1, 2, 3, 4],
    };
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        level: {
          default: 1,
          validate: "number",
        },
        collapsed: {
          default: undefined,
        },
      },
      content: "inline*",
      group: "block",
      defining: true,
      draggable: false,
      parseDOM: this.options.levels.map((level: number) => ({
        tag: `h${level}`,
        attrs: { level },
      })),
      toDOM: (node) => [
        `h${node.attrs.level + (this.options.offset || 0)}`,
        {
          dir: "auto",
          class: "heading-content",
        },
        0,
      ],
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(state.repeat("#", node.attrs.level) + " ");
    state.renderInline(node);
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "heading",
      getAttrs: (token: Token) => ({
        level: +token.tag.slice(1),
      }),
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, Primitive>) =>
      toggleBlockType(type, schema.nodes.paragraph, attrs);
  }

  handleCopyLink = (event: MouseEvent) => {
    if (!(event.currentTarget instanceof HTMLButtonElement)) {
      return;
    }

    const heading = event.currentTarget.closest(".heading-content");
    if (!heading) {
      return;
    }

    // Search previous siblings for the anchor element, as other elements
    // (e.g. multiplayer cursors) may be inserted between the anchor and heading.
    let anchor = heading.previousElementSibling;
    while (
      anchor &&
      !anchor.className?.includes(EditorStyleHelper.headingPositionAnchor)
    ) {
      anchor = anchor.previousElementSibling;
    }

    if (!anchor) {
      return;
    }

    const hash = `#${anchor.id}`;

    // the existing url might contain a hash already, lets make sure to remove
    // that rather than appending another one, along with any /edit suffix.
    const normalizedUrl = removeUrlPathSuffix(
      removeUrlFragment(window.location.href),
      "/edit"
    );
    try {
      copy(normalizedUrl + hash);
      this.editor.props.onNotice?.(t("Link copied to clipboard"));
    } catch (_err) {
      // Some browser contexts disable the prompt() fallback used by
      // copy-to-clipboard, causing it to throw – surface it rather than crash.
      this.editor.props.onNotice?.(
        t("Sorry, the link could not be copied"),
        "error"
      );
    }
  };

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    const options = this.options.levels.reduce(
      (items: Record<string, Command>, level: number) => ({
        ...items,
        [`Shift-Ctrl-${level}`]: toggleBlockType(type, schema.nodes.paragraph, {
          level,
        }),
      }),
      {}
    );

    return {
      ...options,
      Backspace: backspaceToParagraph(type),
      ArrowLeft: ((state, dispatch) => {
        if (!isSafari) {
          return false;
        }

        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type !== type) {
          return false;
        }

        const end = $from.end();
        if ($from.pos !== end || !$from.parent.lastChild?.isText) {
          return false;
        }

        if (dispatch) {
          dispatch(
            state.tr
              .setSelection(TextSelection.create(state.doc, end - 1))
              .scrollIntoView()
          );
        }
        return true;
      }) as Command,
      // Cmd+Left in Firefox lands the DOM caret inside the heading-anchor
      // widget (contentEditable=false, ignoreSelection: true), so Prosemirror
      // does not update its model. Subsequent commands like Enter then operate
      // on the stale position. Move the model selection explicitly to keep it
      // in sync with the visual caret.
      "Mod-ArrowLeft": ((state, dispatch) => {
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type !== type) {
          return false;
        }
        const start = $from.start();
        if ($from.pos === start) {
          return false;
        }
        if (dispatch) {
          dispatch(
            state.tr
              .setSelection(TextSelection.create(state.doc, start))
              .scrollIntoView()
          );
        }
        return true;
      }) as Command,
    };
  }

  get plugins() {
    const createWidgetDecorations = (doc: ProsemirrorNode): Decoration[] => {
      const decorations: Decoration[] = [];

      doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          // Create anchor button to copy a link to the heading
          const anchor = document.createElement("button");
          anchor.innerText = "#";
          anchor.type = "button";
          anchor.contentEditable = "false";
          anchor.className = "heading-anchor";
          anchor.setAttribute("aria-label", "Copy link to heading");
          anchor.addEventListener("mousedown", (event) =>
            this.handleCopyLink(event)
          );

          decorations.push(
            Decoration.widget(
              // Safari requires the widget to be placed at the end of the node rather than the beginning
              // or caret selection is not correct, browser quirk – see issue #1234
              isSafari ? pos + node.nodeSize - 1 : pos + 1,
              anchor,
              {
                // Safari keeps this widget at the end; positive side preserves IME
                // insertion order, while relaxed side preserves caret navigation.
                side: isSafari ? 1 : -1,
                ignoreSelection: true,
                relaxedSide: isSafari,
                key: pos.toString(),
              }
            )
          );

          // Creates a "space" for the caret to move to before the widget.
          // Without this it is very hard to place the caret at the beginning
          // of the heading when it begins with an atom element.
          if (node.firstChild?.isAtom === false) {
            decorations.push(
              Decoration.widget(pos + 1, () => document.createElement("span"), {
                side: -1,
                ignoreSelection: true,
                relaxedSide: true,
                key: "span",
              })
            );
          }
        }
      });

      return decorations;
    };

    const widgetsPlugin: Plugin = new Plugin({
      state: {
        init(_, { doc }) {
          return DecorationSet.create(doc, createWidgetDecorations(doc));
        },
        apply(tr, oldDecoSet) {
          if (tr.docChanged) {
            return DecorationSet.create(
              tr.doc,
              createWidgetDecorations(tr.doc)
            );
          }
          return oldDecoSet.map(tr.mapping, tr.doc);
        },
      },
      props: {
        decorations(state) {
          return this.getState(state);
        },
      },
    });

    return [widgetsPlugin];
  }

  inputRules({ type }: { type: NodeType }) {
    return this.options.levels.map((level: number) =>
      textblockTypeInputRule(new RegExp(`^(#{1,${level}})\\s$`), type, () => ({
        level,
      }))
    );
  }
}
