import { toggleMark } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import { MarkSpec, MarkType } from "prosemirror-model";
import { markInputRuleForPattern } from "../lib/markInputRule";
import Mark from "./Mark";

const heavyWeightRegex = /^(bold(er)?|[5-9]\d{2,})$/;
const normalWeightRegex = /^(normal|[1-4]\d{2,})$/;

export default class Bold extends Mark {
  get name() {
    return "strong";
  }

  get schema(): MarkSpec {
    return {
      parseDOM: [
        {
          tag: "b",
          // Google Docs includes <b> tags with font-weight: normal so we need
          // to account for this case specifically as not becoming bold when pasted.
          getAttrs: (dom: HTMLElement) =>
            normalWeightRegex.test(dom.style.fontWeight) ? false : null,
        },
        { tag: "strong" },
        {
          style: "font-weight",
          getAttrs: (style: string) => heavyWeightRegex.test(style) && null,
        },
      ],
      toDOM: () => ["strong"],
    };
  }

  inputRules({ type }: { type: MarkType }): InputRule[] {
    return [markInputRuleForPattern("**", type)];
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-b": toggleMark(type),
      "Mod-B": toggleMark(type),
    };
  }

  toMarkdown() {
    return {
      open: "**",
      close: "**",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  parseMarkdown() {
    return { mark: "strong" };
  }
}
