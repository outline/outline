import type { Token } from "markdown-it";
import { InputRule } from "prosemirror-inputrules";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import type {
  Attrs,
  MarkSpec,
  MarkType,
  Node,
  Mark as ProsemirrorMark,
} from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { Plugin, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { toast } from "sonner";
import { isUrl, sanitizeUrl } from "../../utils/urls";
import { getMarkRange } from "../queries/getMarkRange";
import Mark from "./Mark";
import {
  addLink,
  openLink,
  removeLink,
  updateLink,
  toggleLink,
} from "../commands/link";
import { isInCode } from "../queries/isInCode";

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

  keys(): Record<string, Command> {
    return {
      "Mod-Enter": openLink(this.options.onClickLink, this.options.dictionary),
    };
  }

  commands() {
    return {
      link: (attrs: Attrs) => toggleLink(attrs),
      addLink,
      updateLink,
      openLink: (): Command =>
        openLink(this.options.onClickLink, this.options.dictionary),
      removeLink,
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
      } catch (_err) {
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
            if (
              !(target instanceof HTMLAnchorElement) ||
              (event.button !== 0 && event.button !== 1)
            ) {
              return false;
            }

            if (
              target.role === "button" ||
              target.matches(".component-attachment *")
            ) {
              return false;
            }

            // If an image is selected in write mode, disallow navigation to its href
            const selectedDOMNode = view.nodeDOM(view.state.selection.from);
            if (
              view.editable &&
              selectedDOMNode &&
              selectedDOMNode instanceof HTMLSpanElement &&
              selectedDOMNode.classList.contains("component-image") &&
              event.target instanceof HTMLImageElement &&
              selectedDOMNode.contains(event.target)
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
                if (this.options.onClickLink && href) {
                  event.stopPropagation();
                  event.preventDefault();
                  this.options.onClickLink(sanitizeUrl(href), event);
                }
              } catch (_err) {
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
          click: (_view: EditorView, event: MouseEvent) => {
            if (
              !(event.target instanceof HTMLAnchorElement) ||
              (event.button !== 0 && event.button !== 1)
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
          keydown: (view: EditorView, event: KeyboardEvent) => {
            if (event.key !== " " && event.key !== "Enter") {
              return false;
            }

            const { state } = view;
            const { selection, schema } = state;
            if (!selection.empty || !selection.$from.parent.isTextblock) {
              return false;
            }

            let textContent = "";
            selection.$from.parent.forEach((node) => {
              if (node.isText && node.text) {
                textContent += node.text;
              }
            });
            const words = textContent.split(/\s+/);
            if (!words.length) {
              return false;
            }

            // check if there is a code mark at the current cursor position
            const hasCodeMark = schema.marks.code_inline.isInSet(
              selection.$from.marks()
            );
            if (hasCodeMark) {
              return false;
            }

            // check if we are in a code block or code fence
            if (isInCode(view.state, { onlyBlock: true })) {
              return false;
            }

            const lastWord = words[words.length - 1];
            if (
              !lastWord ||
              !isUrl(lastWord, {
                requireProtocol: false,
              })
            ) {
              return false;
            }

            const lastWordIndex = textContent.lastIndexOf(lastWord);
            if (lastWordIndex === -1) {
              return false;
            }

            const start = selection.$from.start() + lastWordIndex;
            const end = start + lastWord.length;
            const href = lastWord.startsWith("www.")
              ? `https://${lastWord}`
              : lastWord;

            const tr = state.tr.addMark(
              start,
              end,
              schema.marks.link.create({ href })
            );

            view.dispatch(tr);

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
