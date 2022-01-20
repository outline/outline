import { toggleMark } from "prosemirror-commands";
import { MarkSpec, MarkType } from "prosemirror-model";
import markInputRule from "../lib/markInputRule";
import markRule from "../rules/mark";
import Mark from "./Mark";

export default class Highlight extends Mark {
  get name() {
    return "highlight";
  }

  get schema(): MarkSpec {
    return {
      parseDOM: [{ tag: "mark" }],
      toDOM: () => ["mark"],
    };
  }

  inputRules({ type }: { type: MarkType }) {
    return [markInputRule(/(?:==)([^=]+)(?:==)$/, type)];
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-Ctrl-h": toggleMark(type),
    };
  }

  get rulePlugins() {
    return [markRule({ delim: "==", mark: "highlight" })];
  }

  toMarkdown() {
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
