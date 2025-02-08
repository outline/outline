import { Token } from "markdown-it";
import { toggleMark } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import { MarkdownSerializerState } from "prosemirror-markdown";
import {
  MarkSpec,
  MarkType,
  Node,
  Mark as ProsemirrorMark,
} from "prosemirror-model";
import { Command, EditorState, Plugin, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { toast } from "sonner";
import { sanitizeUrl } from "../../utils/urls";
import { getMarkRange } from "../queries/getMarkRange";
import { isMarkActive } from "../queries/isMarkActive";
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
          validate: "string",
        },
        title: {
          default: null,
          validate: "string|null",
        },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]:not(.embed)",
          getAttrs: (dom: HTMLElement) => ({
            href: dom.getAttribute("href"),
            title: dom.getAttribute("title"),
          }),
        },
      ],
      toDOM: (node) => [
        "a",
        {
          title: node.attrs.title,
          href: sanitizeUrl(node.attrs.href),
          class: "use-hover-preview",
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

  keys({ type }: { type: MarkType }): Record<string, Command> {
    return {
      "Mod-k": (state, dispatch) => {
        if (state.selection.empty) {
          return false;
        }

        return toggleMark(type, { href: "" })(state, dispatch);
      },
      "Mod-Enter": (state) => {
        if (isMarkActive(type)(state)) {
          const range = getMarkRange(
            state.selection.$from,
            state.schema.marks.link
          );
          if (range && range.mark && this.options.onClickLink) {
            try {
              const event = new KeyboardEvent("keydown", { metaKey: false });
              this.options.onClickLink(
                sanitizeUrl(range.mark.attrs.href),
                event
              );
            } catch (err) {
              toast.error(this.options.dictionary.openLinkError);
            }
            return true;
          }
        }
        return false;
      },
    };
  }

  get plugins() {
    const handleClick = (view: EditorView, pos: number) => {
      const { doc, tr } = view.state;
      const range = getMarkRange(
        doc.resolve(pos),
        this.editor.schema.marks.link
      );

      if (!range || range.from === pos || range.to === pos) {
        return false;
      }

      try {
        const $start = doc.resolve(range.from);
        const $end = doc.resolve(range.to);
        tr.setSelection(new TextSelection($start, $end));

        view.dispatch(tr);
        return true;
      } catch (err) {
        // Failed to set selection
      }
      return false;
    };

    const plugin: Plugin = new Plugin({
      props: {
        decorations: (state: EditorState) => plugin.getState(state),
        handleDOMEvents: {
          contextmenu: (view: EditorView, event: MouseEvent) => {
            const result = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (result) {
              return handleClick(view, result.pos);
            }

            return false;
          },
          mousedown: (view: EditorView, event: MouseEvent) => {
            const target = (event.target as HTMLElement)?.closest("a");
            if (!(target instanceof HTMLAnchorElement) || event.button !== 0) {
              return false;
            }

            if (
              target.role === "button" ||
              target.matches(".component-attachment *")
            ) {
              return false;
            }

            // clicking a link while editing should show the link toolbar,
            // clicking in read-only will navigate
            if (!view.editable || (view.editable && !view.hasFocus())) {
              const href =
                target.href ||
                (target.parentNode instanceof HTMLAnchorElement
                  ? target.parentNode.href
                  : "");

              try {
                if (this.options.onClickLink) {
                  event.stopPropagation();
                  event.preventDefault();
                  this.options.onClickLink(sanitizeUrl(href), event);
                }
              } catch (err) {
                toast.error(this.options.dictionary.openLinkError);
              }

              return true;
            }

            const result = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });

            if (result && handleClick(view, result.pos)) {
              event.preventDefault();
              return true;
            }

            return false;
          },
          click: (view: EditorView, event: MouseEvent) => {
            if (
              !(event.target instanceof HTMLAnchorElement) ||
              event.button !== 0
            ) {
              return false;
            }

            if (
              event.target.role === "button" ||
              event.target.matches(".component-attachment *")
            ) {
              return false;
            }

            // Prevent all default click behavior of links, see mousedown above
            // for custom link handling.
            if (this.options.onClickLink) {
              event.stopPropagation();
              event.preventDefault();
            }

            return false;
          },
        },
      },
    });

    return [plugin];
  }

  toMarkdown() {
    return {
      open: (
        _state: MarkdownSerializerState,
        mark: ProsemirrorMark,
        parent: Node,
        index: number
      ) => (isPlainURL(mark, parent, index, 1) ? "<" : "["),
      close: (
        state: MarkdownSerializerState,
        mark: ProsemirrorMark,
        parent: Node,
        index: number
      ) =>
        isPlainURL(mark, parent, index, -1)
          ? ">"
          : "](" +
            state.esc(mark.attrs.href) +
            (mark.attrs.title ? " " + quote(mark.attrs.title) : "") +
            ")",
    };
  }

  parseMarkdown() {
    return {
      mark: "link",
      getAttrs: (token: Token) => ({
        href: token.attrGet("href"),
        title: token.attrGet("title") || null,
      }),
    };
  }
}

function quote(str: string) {
  const wrap =
    str.indexOf('"') === -1 ? '""' : str.indexOf("'") === -1 ? "''" : "()";
  return wrap[0] + str + wrap[1];
}
