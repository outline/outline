import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "../lib/Extension";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const HEX_COLOR_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})\b/g;

type HexPluginState = {
  decorations: DecorationSet;
};

const pluginKey = new PluginKey<HexPluginState>("hex_color_preview");

function createSwatch(color: string): HTMLElement {
  const swatch = document.createElement("span");
  swatch.className = EditorStyleHelper.hexColorSwatch;
  swatch.setAttribute("aria-hidden", "true");
  swatch.style.backgroundColor = color;
  return swatch;
}

function buildDecorations(state: EditorState): DecorationSet {
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
        Decoration.widget(end, () => createSwatch(hex), {
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
            decorations: buildDecorations(state),
          }),
          apply: (
            tr: Transaction,
            pluginState: HexPluginState,
            _oldState,
            newState
          ) => {
            if (!tr.docChanged) {
              return pluginState;
            }
            return {
              decorations: buildDecorations(newState),
            };
          },
        },
        props: {
          decorations: (state) => pluginKey.getState(state)?.decorations,
        },
      }),
    ];
  }
}
