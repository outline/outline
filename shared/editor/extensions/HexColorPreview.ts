import copy from "copy-to-clipboard";
import { t } from "i18next";
import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { toast } from "sonner";
import Extension from "../lib/Extension";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const HEX_COLOR_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})\b/g;

type HexPluginState = {
  decorations: DecorationSet;
};

const pluginKey = new PluginKey<HexPluginState>("hex_color_preview");

/**
 * An editor extension that renders a small colored circle after any valid hex
 * color code found inside an inline code mark.
 */
export default class HexColorPreview extends Extension {
  get name() {
    return "hex_color_preview";
  }

  get plugins() {
    return [
      new Plugin<HexPluginState>({
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
      HEX_COLOR_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = HEX_COLOR_REGEX.exec(text)) !== null) {
        const hex = match[0];
        const end = pos + match.index + hex.length;

        decorations.push(
          Decoration.widget(end, () => this.createSwatch(hex), {
            // Use side: -1 so the swatch renders before the fake-cursor widget
            // from prosemirror-codemark, which uses side 0/-1 to represent the
            // "inside"/"outside" cursor positions at mark boundaries.
            side: -1,
            key: `hex-${hex}`,
            marks: [codeMark],
          })
        );
      }
    });

    return DecorationSet.create(state.doc, decorations);
  }

  private createSwatch(color: string): HTMLElement {
    const swatch = document.createElement("span");
    swatch.className = EditorStyleHelper.hexColorSwatch;
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.backgroundColor = color;

    const luminance = this.getRelativeLuminance(color);
    if (luminance > 0.85) {
      swatch.classList.add(EditorStyleHelper.hexColorSwatchLight);
    } else if (luminance < 0.1) {
      swatch.classList.add(EditorStyleHelper.hexColorSwatchDark);
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

  private getRelativeLuminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const channel = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
}
