import { isHexColor } from "class-validator";
import { parseToRgb, rgba } from "polished";
import { toggleMark } from "prosemirror-commands";
import type { MarkSpec, MarkType } from "prosemirror-model";
import { markInputRuleForPattern } from "../lib/markInputRule";
import markRule from "../rules/mark";
import Mark from "./Mark";
import { presetColors, hexToRgba } from "@shared/utils/color";

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

  /**
   * Finds the closest matching preset color for a given CSS color value.
   *
   * @param cssColor - A CSS color value (hex, rgb, rgba, etc.).
   * @returns The matching preset color hex, or null if no close match found.
   */
  static findMatchingPresetColor(cssColor: string): string | null {
    try {
      const parsed = parseToRgb(cssColor);
      const inputRgb = { r: parsed.red, g: parsed.green, b: parsed.blue };

      for (const preset of Highlight.presetColors) {
        const presetRgb = hexToRgba(preset.hex);
        // Allow some tolerance for color matching (e.g., due to opacity differences)
        const tolerance = 30;
        if (
          Math.abs(inputRgb.r - presetRgb.red) <= tolerance &&
          Math.abs(inputRgb.g - presetRgb.green) <= tolerance &&
          Math.abs(inputRgb.b - presetRgb.blue) <= tolerance
        ) {
          return preset.hex;
        }
      }
    } catch {
      // Failed to parse the color
    }
    return null;
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
              color: isHexColor(color) ? color : null,
            };
          },
        },
        {
          style: "background-color",
          getAttrs: (style: string) => {
            const matchedColor = Highlight.findMatchingPresetColor(style);
            // Only apply highlight if we found a matching preset color
            // or if the color is clearly a highlight (not white/transparent)
            if (matchedColor) {
              return { color: matchedColor };
            }
            // Check if it's a meaningful background color (not white/transparent)
            try {
              const parsed = parseToRgb(style);
              // Skip very light colors that are likely page backgrounds
              const isLight =
                parsed.red > 250 && parsed.green > 250 && parsed.blue > 250;
              if (!isLight) {
                return { color: null };
              }
            } catch {
              // Failed to parse
            }
            return false;
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
