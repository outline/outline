import { toggleMark } from "prosemirror-commands";
import markInputRule from "../lib/markInputRule";
import Mark from "./Mark";
import underlinesRule from "../rules/underlines";

export default class Underline extends Mark {
  get name() {
    return "underline";
  }

  get schema() {
    return {
      parseDOM: [
        { tag: "u" },
        {
          style: "text-decoration",
          getAttrs: value => value === "underline",
        },
      ],
      toDOM: () => ["u", 0],
    };
  }

  get rulePlugins() {
    return [underlinesRule];
  }

  inputRules({ type }) {
    return [markInputRule(/(?:__)([^_]+)(?:__)$/, type)];
  }

  keys({ type }) {
    return {
      "Mod-u": toggleMark(type),
    };
  }

  get toMarkdown() {
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
