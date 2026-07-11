import copy from "copy-to-clipboard";
import { t } from "i18next";
import { getLuminance } from "polished";
import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { toast } from "sonner";
import Extension from "../lib/Extension";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

// Matches a CSS color in hex (#RGB, #RGBA, #RRGGBB, #RRGGBBAA), rgb()/rgba(),
// or hsl()/hsla() notation. Functional matches are loose here and validated by
// getLuminance, which throws for anything that isn't a real color.
const COLOR_REGEX = new RegExp(
  [
    "#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\\b",
    "(?:rgba?|hsla?)\\([^)]*\\)",
  ].join("|"),
  "gi"
);

type ColorPluginState = {
  decorations: DecorationSet;
};

const pluginKey = new PluginKey<ColorPluginState>("color_swatch_preview");

/**
 * An editor extension that renders a small colored circle after any valid CSS
 * color (hex, rgb/rgba, or hsl/hsla) found inside an inline code mark.
 */
export default class ColorSwatchPreview extends Extension {
  get name() {
    return "color_swatch_preview";
  }

  get plugins() {
    return [
      new Plugin<ColorPluginState>({
        key: pluginKey,
        state: {
          init: (_, state) => ({
            decorations: this.buildDecorations(state),
          }),
          apply: (tr, pluginState, _oldState, newState) => {
            if (!tr.docChanged) {
              return pluginState;
            }
            return {
              decorations: this.buildDecorations(newState),
            };
          },
        },
        props: {
          decorations: (state) => pluginKey.getState(state)?.decorations,
        },
      }),
    ];
  }

  private buildDecorations(state: EditorState): DecorationSet {
    const codeMarkType = state.schema.marks.code_inline;
    if (!codeMarkType) {
      return DecorationSet.empty;
    }

    const decorations: Decoration[] = [];

    state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) {
        return;
      }

      const codeMark = node.marks.find((mark) => mark.type === codeMarkType);
      if (!codeMark) {
        return;
      }

      const text = node.text;
      COLOR_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = COLOR_REGEX.exec(text)) !== null) {
        const color = match[0];

        // getLuminance throws for anything that isn't a real color, which also
        // filters out false-positive regex matches like "rgb(foo)".
        let luminance: number;
        try {
          luminance = getLuminance(color);
        } catch {
          continue;
        }

        const end = pos + match.index + color.length;

        decorations.push(
          Decoration.widget(end, () => this.createSwatch(color, luminance), {
            // Use side: -1 so the swatch renders before the fake-cursor widget
            // from prosemirror-codemark, which uses side 0/-1 to represent the
            // "inside"/"outside" cursor positions at mark boundaries.
            side: -1,
            key: `color-${end}-${color}`,
            marks: [codeMark],
          })
        );
      }
    });

    return DecorationSet.create(state.doc, decorations);
  }

  private createSwatch(color: string, luminance: number): HTMLElement {
    const swatch = document.createElement("span");
    swatch.className = EditorStyleHelper.colorSwatch;
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.backgroundColor = color;

    if (luminance > 0.85) {
      swatch.classList.add(EditorStyleHelper.colorSwatchLight);
    } else if (luminance < 0.1) {
      swatch.classList.add(EditorStyleHelper.colorSwatchDark);
    }

    swatch.addEventListener("mousedown", (event) => {
      // Prevent the editor from moving the cursor into the code mark on click.
      event.preventDefault();
    });
    swatch.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      copy(color);
      toast.message(t("Copied to clipboard"));
    });

    return swatch;
  }
}
