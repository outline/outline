import { toggleMark } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import { MarkSpec, MarkType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import markInputRule from "../lib/markInputRule";
import Mark from "./Mark";

export default class Italic extends Mark {
  get name() {
    return "em";
  }

  get schema(): MarkSpec {
    return {
      parseDOM: [
        { tag: "i" },
        { tag: "em" },
        {
          style: "font-style",
          getAttrs: (value) => (value === "italic" ? null : false),
        },
      ],
      toDOM: () => ["em"],
    };
  }

  inputRules({ type }: { type: MarkType }): InputRule[] {
    /**
     * Due to use of snake_case strings common in docs the matching conditions
     * are a bit more strict than e.g. the ** bold syntax to help prevent
     * false positives.
     *
     * Matches:
     * _1_
     * _123_
     * (_one_
     * [_one_
     *
     * No match:
     * __
     * __123_
     * __123__
     * _123
     * one_123_
     * ONE_123_
     * 1_123_
     */
    return [
      markInputRule(/(?:^|[^_a-zA-Z0-9])(_([^_]+)_)$/, type),
      markInputRule(/(?:^|[^*a-zA-Z0-9])(\*([^*]+)\*)$/, type),
    ];
  }

  keys({ type }: { type: MarkType }): Record<string, Command> {
    return {
      "Mod-i": toggleMark(type),
      "Mod-I": toggleMark(type),
    };
  }

  toMarkdown() {
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
