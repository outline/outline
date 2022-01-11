import { toggleMark } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import { MarkSpec, MarkType } from "prosemirror-model";
import markInputRule from "../lib/markInputRule";
import Mark from "./Mark";

export default class Bold extends Mark {
  get name() {
    return "strong";
  }

  get schema(): MarkSpec {
    return {
      parseDOM: [{ tag: "b" }, { tag: "strong" }],
      toDOM: () => ["strong"],
    };
  }

  inputRules({ type }: { type: MarkType }): InputRule[] {
    return [markInputRule(/(?:\*\*)([^*]+)(?:\*\*)$/, type)];
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
