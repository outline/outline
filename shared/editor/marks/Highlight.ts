import { rgba } from "polished";
import { toggleMark } from "prosemirror-commands";
import type { MarkSpec, MarkType } from "prosemirror-model";
import { markInputRuleForPattern } from "../lib/markInputRule";
import markRule from "../rules/mark";
import Mark from "./Mark";
import { presetColors } from "@shared/utils/color";

export default class Highlight extends Mark {
  /** The default opacity of the highlight */
  static opacity = 0.4;

  /** Preset colors available for highlighting */
  static presetColors = presetColors;

  /**
   * Checks if a color is one of the highlight preset colors.
   *
   * @param color - A hex color string to check.
   * @returns true if the color matches a preset color's hex value.
   */
  static isPresetColor(color: string): boolean {
    return Highlight.presetColors.some((c) => c.hex === color);
  }

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
              color: Highlight.isPresetColor(color) ? color : null,
            };
          },
        },
      ],
      toDOM: (node) => [
        "mark",
        {
          "data-color": node.attrs.color,
          style: `background-color: ${rgba(
            node.attrs.color || Highlight.presetColors[0].hex,
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
