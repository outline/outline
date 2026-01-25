import { rgba } from "polished";
import { toggleMark } from "prosemirror-commands";
import type { MarkSpec, MarkType } from "prosemirror-model";
import { markInputRuleForPattern } from "../lib/markInputRule";
import markRule from "../rules/mark";
import Mark from "./Mark";
import { presetColorNames, presetColors } from "../presetColors";

export default class Highlight extends Mark {
  /** The colors that can be used for highlighting */
  static colors = presetColors;

  /** The names of the colors that can be used for highlighting, must match length of array above */
  static colorNames = presetColorNames;

  /** The default opacity of the highlight */
  static opacity = 0.4;

  get name() {
    return "highlight";
  }

  get schema(): MarkSpec {
    return {
      attrs: {
        color: {
          default: null,
          validate: "string|null",
        },
      },
      parseDOM: [
        {
          tag: "mark",
          getAttrs: (dom) => {
            const color = dom.getAttribute("data-color") || "";

            return {
              color: Highlight.colors.includes(color) ? color : null,
            };
          },
        },
      ],
      toDOM: (node) => [
        "mark",
        {
          "data-color": node.attrs.color,
          style: `background-color: ${rgba(
            node.attrs.color || Highlight.colors[0],
            Highlight.opacity
          )}`,
        },
      ],
    };
  }

  inputRules({ type }: { type: MarkType }) {
    return [markInputRuleForPattern("==", type)];
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-Shift-h": toggleMark(type),
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
