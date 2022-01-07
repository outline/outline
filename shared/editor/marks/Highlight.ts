import { toggleMark } from "prosemirror-commands";
import markInputRule from "../lib/markInputRule";
import Mark from "./Mark";
import markRule from "../rules/mark";

export default class Highlight extends Mark {
  get name() {
    return "highlight";
  }

  get schema() {
    return {
      parseDOM: [{ tag: "mark" }],
      toDOM: () => ["mark"],
    };
  }

  inputRules({ type }) {
    return [markInputRule(/(?:==)([^=]+)(?:==)$/, type)];
  }

  keys({ type }) {
    return {
      "Mod-Ctrl-h": toggleMark(type),
    };
  }

  get rulePlugins() {
    return [markRule({ delim: "==", mark: "highlight" })];
  }

  get toMarkdown() {
    return {
      open: "==",
      close: "==",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  parseMarkdown() {
    return { mark: "highlight" };
  }
}
