import { parseToRgb, rgba } from "polished";
import type { MarkSpec, MarkType } from "prosemirror-model";
import { toggleMark } from "../commands/toggleMark";
import { markInputRuleForPattern } from "../lib/markInputRule";
import markRule from "../rules/mark";
import Mark from "./Mark";
import {
  presetColors,
  hexToRgba,
  toHexColor,
  validateColorHex,
} from "@shared/utils/color";

/**
 * Whether an ancestor element already paints the same background, in which case
 * the element is inheriting the shading of a container – such as a table cell –
 * rather than highlighting text.
 */
function isInheritedBackground(dom: HTMLElement, color: string): boolean {
  const hex = toHexColor(color);
  if (!hex) {
    return false;
  }

  let parent = dom.parentElement;
  while (parent) {
    // Ancestors that paint nothing, such as a transparent background, are
    // skipped so that the closest painted background is the one compared.
    const background = parent.style?.backgroundColor;
    const parentHex = background ? toHexColor(background) : null;
    if (parentHex) {
      return parentHex === hex;
    }
    parent = parent.parentElement;
  }

  return false;
}

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
   * Finds the preset color matching a CSS color value. Opacity is ignored, so a
   * preset rendered translucently still matches.
   *
   * @param cssColor - A CSS color value (hex, rgb, rgba, etc.).
   * @returns The matching preset color hex, or null if none match.
   */
  static findMatchingPresetColor(cssColor: string): string | null {
    try {
      const { red, green, blue } = parseToRgb(cssColor);

      for (const preset of Highlight.presetColors) {
        const presetRgb = hexToRgba(preset.hex);
        if (
          red === presetRgb.red &&
          green === presetRgb.green &&
          blue === presetRgb.blue
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
              color: validateColorHex(color) ? color : null,
            };
          },
        },
        {
          tag: "span[style]",
          getAttrs: (dom) => {
            const style = dom.style.backgroundColor;
            if (!style || isInheritedBackground(dom, style)) {
              return false;
            }
            // Any background that is not one of the highlight colors is styling
            // belonging to the source document, rather than a highlight.
            const matchedColor = Highlight.findMatchingPresetColor(style);
            return matchedColor ? { color: matchedColor } : false;
          },
        },
      ],
      toDOM: (node) => {
        // rgba() throws for a color it cannot parse, which would stop the
        // document rendering.
        const color = validateColorHex(node.attrs.color ?? "")
          ? node.attrs.color
          : null;

        return [
          "mark",
          {
            "data-color": color,
            style: `background-color: ${rgba(
              color || Highlight.presetColors[0].hex,
              Highlight.opacity
            )}`,
          },
        ];
      },
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
