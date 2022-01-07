import { toggleMark } from "prosemirror-commands";
import markInputRule from "../lib/markInputRule";
import Mark from "./Mark";

export default class Italic extends Mark {
  get name() {
    return "em";
  }

  get schema() {
    return {
      parseDOM: [
        { tag: "i" },
        { tag: "em" },
        { style: "font-style", getAttrs: value => value === "italic" },
      ],
      toDOM: () => ["em"],
    };
  }

  inputRules({ type }) {
    return [
      markInputRule(/(?:^|[\s])(_([^_]+)_)$/, type),
      markInputRule(/(?:^|[^*])(\*([^*]+)\*)$/, type),
    ];
  }

  keys({ type }) {
    return {
      "Mod-i": toggleMark(type),
      "Mod-I": toggleMark(type),
    };
  }

  get toMarkdown() {
    return {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  parseMarkdown() {
    return { mark: "em" };
  }
}
