import { toggleMark } from "prosemirror-commands";
import { MarkSpec, MarkType } from "prosemirror-model";
import { markInputRuleForPattern } from "../lib/markInputRule";
import Mark from "./Mark";

export default class Strikethrough extends Mark {
  get name() {
    return "strikethrough";
  }

  get schema(): MarkSpec {
    return {
      parseDOM: [
        {
          tag: "s",
        },
        {
          tag: "del",
        },
        {
          tag: "strike",
        },
        {
          style: "text-decoration",
          getAttrs: (value) => (value === "line-through" ? null : false),
        },
      ],
      toDOM: () => ["del", 0],
    };
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-d": toggleMark(type),
    };
  }

  inputRules({ type }: { type: MarkType }) {
    return [markInputRuleForPattern("~", type)];
  }

  toMarkdown() {
    return {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  get markdownToken() {
    return "s";
  }

  parseMarkdown() {
    return { mark: "strikethrough" };
  }
}
