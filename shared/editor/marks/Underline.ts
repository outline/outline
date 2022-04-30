import { toggleMark } from "prosemirror-commands";
import { MarkSpec, MarkType } from "prosemirror-model";
import markInputRule from "../lib/markInputRule";
import underlinesRule from "../rules/underlines";
import Mark from "./Mark";

export default class Underline extends Mark {
  get name() {
    return "underline";
  }

  get schema(): MarkSpec {
    return {
      parseDOM: [
        { tag: "u" },
        {
          style: "text-decoration",
          getAttrs: (value) => (value === "underline" ? null : false),
        },
      ],
      toDOM: () => ["u", 0],
    };
  }

  get rulePlugins() {
    return [underlinesRule];
  }

  inputRules({ type }: { type: MarkType }) {
    return [markInputRule(/(?:__)([^_]+)(?:__)$/, type)];
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-u": toggleMark(type),
    };
  }

  toMarkdown() {
    return {
      open: "__",
      close: "__",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  parseMarkdown() {
    return { mark: "underline" };
  }
}
