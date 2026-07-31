import { isHexColor } from "class-validator";
import { parseToRgb } from "polished";
import type {
  MarkSpec,
  MarkType,
  Mark as ProsemirrorMark,
} from "prosemirror-model";
import { toggleMark } from "../commands/toggleMark";
import Mark from "./Mark";
import { presetTextColors, rgbaToHex } from "@shared/utils/color";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";

export default class TextColor extends Mark {
  /** Preset colors available for text coloring */
  static presetColors = presetTextColors;

  /**
   * Checks if a color is one of the text color preset colors.
   *
   * @param color - A hex color string to check.
   * @returns true if the color matches a preset color's hex value.
   */
  static isPresetColor(color: string): boolean {
    return TextColor.presetColors.some((c) => c.hex === color);
  }

  get name() {
    return "textColor";
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
          tag: "span[data-text-color]",
          getAttrs: (dom) => {
            const color = dom.getAttribute("data-text-color") || "";
            return {
              color: isHexColor(color) ? color : null,
            };
          },
        },
        {
          tag: "span[style]",
          consuming: false,
          getAttrs: (dom) => {
            const style = dom.style.color;
            if (!style) {
              return false;
            }
            try {
              const parsed = parseToRgb(style);
              // Skip near-black colors (likely default text color)
              const isNearBlack =
                parsed.red < 30 && parsed.green < 30 && parsed.blue < 30;
              if (isNearBlack) {
                return false;
              }
              // Skip near-white colors
              const isNearWhite =
                parsed.red > 240 && parsed.green > 240 && parsed.blue > 240;
              if (isNearWhite) {
                return false;
              }
              const color = rgbaToHex(
                "alpha" in parsed ? parsed : { ...parsed, alpha: 1 }
              ).toUpperCase();
              return { color };
            } catch {
              return false;
            }
          },
        },
        {
          tag: "font[color]",
          getAttrs: (dom) => {
            const color = dom.getAttribute("color") || "";
            return {
              color: isHexColor(color) ? color : null,
            };
          },
        },
      ],
      toDOM: (node) => [
        "span",
        {
          "data-text-color": node.attrs.color,
          style: node.attrs.color ? `color: ${node.attrs.color}` : undefined,
        },
      ],
    };
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-Shift-t": toggleMark(type),
    };
  }

  toMarkdown() {
    return {
      open(_state: MarkdownSerializerState, mark: ProsemirrorMark) {
        return `<span style="color: ${mark.attrs.color}">`;
      },
      close: "</span>",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  parseMarkdown() {
    return { mark: "textColor" };
  }
}
