import Token from "markdown-it/lib/token";
import { toggleMark } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import { MarkdownSerializerState } from "prosemirror-markdown";
import {
  MarkSpec,
  MarkType,
  Node,
  Mark as ProsemirrorMark,
} from "prosemirror-model";
import {
  Transaction,
  EditorState,
  Plugin,
  TextSelection,
} from "prosemirror-state";
import getMarkRange from "../queries/getMarkRange";
import Mark from "./Mark";

const LINK_INPUT_REGEX = /\[([^[]+)]\((\S+)\)$/;

function isPlainURL(
  link: ProsemirrorMark,
  parent: Node,
  index: number,
  side: -1 | 1
) {
  if (link.attrs.title || !/^\w+:/.test(link.attrs.href)) {
    return false;
  }

  const content = parent.child(index + (side < 0 ? -1 : 0));
  if (
    !content.isText ||
    content.text !== link.attrs.href ||
    content.marks[content.marks.length - 1] !== link
  ) {
    return false;
  }

  if (index === (side < 0 ? 1 : parent.childCount - 1)) {
    return true;
  }

  const next = parent.child(index + (side < 0 ? -2 : 1));
  return !link.isInSet(next.marks);
}

export default class Link extends Mark {
  get name() {
    return "link";
  }

  get schema(): MarkSpec {
    return {
      attrs: {
        href: {
          default: "",
        },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs: (dom: HTMLElement) => ({
            href: dom.getAttribute("href"),
          }),
        },
      ],
      toDOM: (node) => [
        "a",
        {
          ...node.attrs,
          rel: "noopener noreferrer nofollow",
        },
        0,
      ],
    };
  }

  inputRules({ type }: { type: MarkType }) {
    return [
      new InputRule(LINK_INPUT_REGEX, (state, match, start, end) => {
        const [okay, alt, href] = match;
        const { tr } = state;

        if (okay) {
          tr.replaceWith(start, end, this.editor.schema.text(alt)).addMark(
            start,
            start + alt.length,
            type.create({ href })
          );
        }

        return tr;
      }),
    ];
  }

  commands({ type }: { type: MarkType }) {
    return ({ href } = { href: "" }) => toggleMark(type, { href });
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-k": (state: EditorState, dispatch: (tr: Transaction) => void) => {
        if (state.selection.empty) {
          this.options.onKeyboardShortcut();
          return true;
        }

        return toggleMark(type, { href: "" })(state, dispatch);
      },
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mouseover: (_view, event: MouseEvent) => {
              if (
                event.target instanceof HTMLAnchorElement &&
                !event.target.className.includes("ProseMirror-widget")
              ) {
                if (this.options.onHoverLink) {
                  return this.options.onHoverLink(event);
                }
              }
              return false;
            },
            click: (view, event: MouseEvent) => {
              if (!(event.target instanceof HTMLAnchorElement)) {
                return false;
              }

              // clicking a link while editing should select the entire link
              // which will trigger the link editing toolbar to be displayed
              if (view.editable) {
                const { state, dispatch } = view;
                const range = getMarkRange(
                  state.selection.$from,
                  state.schema.marks.link
                );

                if (range) {
                  dispatch(
                    state.tr.setSelection(
                      new TextSelection(
                        state.doc.resolve(range.from),
                        state.doc.resolve(range.to)
                      )
                    )
                  );
                }

                // clicking while read-only will navigate directly to the link
              } else {
                const href =
                  event.target.href ||
                  (event.target.parentNode instanceof HTMLAnchorElement
                    ? event.target.parentNode.href
                    : "");

                const isHashtag = href.startsWith("#");
                if (isHashtag && this.options.onClickHashtag) {
                  event.stopPropagation();
                  event.preventDefault();
                  this.options.onClickHashtag(href, event);
                }

                if (this.options.onClickLink) {
                  event.stopPropagation();
                  event.preventDefault();
                  this.options.onClickLink(href, event);
                }
              }

              return true;
            },
          },
        },
      }),
    ];
  }

  toMarkdown() {
    return {
      open(
        _state: MarkdownSerializerState,
        mark: ProsemirrorMark,
        parent: Node,
        index: number
      ) {
        return isPlainURL(mark, parent, index, 1) ? "<" : "[";
      },
      close(
        state: MarkdownSerializerState,
        mark: ProsemirrorMark,
        parent: Node,
        index: number
      ) {
        return isPlainURL(mark, parent, index, -1)
          ? ">"
          : "](" +
              state.esc(mark.attrs.href) +
              (mark.attrs.title ? " " + state.quote(mark.attrs.title) : "") +
              ")";
      },
    };
  }

  parseMarkdown() {
    return {
      mark: "link",
      getAttrs: (tok: Token) => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title") || null,
      }),
    };
  }
}
