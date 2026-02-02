import type { MarkSpec, MarkType } from "prosemirror-model";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import { InputRule } from "prosemirror-inputrules";
import { getMarksBetween } from "../queries/getMarksBetween";
import Mark from "./Mark";

export default class Hashtag extends Mark {
  get name() {
    return "hashtag";
  }

  get schema(): MarkSpec {
    return {
      attrs: {
        tag: {
          default: "",
          validate: "string",
        },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "span.hashtag",
          getAttrs: (dom: HTMLElement) => ({
            tag: dom.getAttribute("data-tag") || dom.textContent?.replace("#", "") || "",
          }),
        },
      ],
      toDOM: (node) => [
        "span",
        {
          class: "hashtag",
          "data-tag": node.attrs.tag,
        },
        0,
      ],
    };
  }

  inputRules({ type }: { type: MarkType }) {
    // Правило для автоматического создания хештега при вводе #tag
    return [
      createHashtagInputRule(
        /(?:^|\s)(?<remove>#(?<text>[\p{L}][\p{L}\p{N}_]{0,49}))$/u,
        type,
        false
      ),
      createHashtagInputRule(
        /(?:^|\s)(?<remove>#(?<text>[\p{L}][\p{L}\p{N}_]{0,49}))\s$/u,
        type,
        true
      ),
    ];
  }

  toMarkdown() {
    return {
      open: "#",
      close: "",
      mixable: false,
      expelEnclosingWhitespace: false,
    };
  }

  parseMarkdown() {
    return { mark: "hashtag" };
  }
}

function createHashtagInputRule(
  regexp: RegExp,
  markType: MarkType,
  preserveTrailingSpace: boolean
): InputRule {
  return new InputRule(regexp, (state, match, start, end) => {
    const fullMatch = match[0] || "";
    const captureGroup = match.groups?.text ?? match[match.length - 1];
    const removalGroup = match.groups?.remove ?? match[match.length - 2];

    if (!captureGroup) {
      return null;
    }

    const matchStart = start + fullMatch.lastIndexOf(removalGroup);
    const textStart = start + fullMatch.lastIndexOf(captureGroup);
    const textEnd = textStart + captureGroup.length;

    const excludedMarks = getMarksBetween(start, end, state)
      .filter((item) => item.mark.type.excludes(markType))
      .filter((item) => item.end > matchStart);

    if (excludedMarks.length) {
      return null;
    }

    const { tr } = state;
    const trailingSpace =
      preserveTrailingSpace && /\s$/.test(fullMatch) ? 1 : 0;

    if (textEnd < end - trailingSpace) {
      tr.delete(textEnd, end - trailingSpace);
    }
    if (textStart > start) {
      tr.delete(matchStart, textStart);
    }

    const normalizedTag =
      typeof captureGroup === "string"
        ? captureGroup.toLowerCase()
        : "";

    const markStart = matchStart;
    const markEnd = markStart + captureGroup.length;
    tr.addMark(markStart, markEnd, markType.create({ tag: normalizedTag }));
    tr.removeStoredMark(markType);
    return tr;
  });
}
