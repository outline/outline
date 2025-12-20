import type { EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

interface CodeWordDecorationsConfig {
  /** CSS class to apply to word decorations */
  className?: string;
}

class CodeWordDecorationsPlugin extends Plugin {
  constructor(config: CodeWordDecorationsConfig = {}) {
    const defaultConfig: Required<CodeWordDecorationsConfig> = {
      className: EditorStyleHelper.codeWord,
    };

    const finalConfig = { ...defaultConfig, ...config };

    super({
      state: {
        init: (_, state: EditorState) => ({
          decorations: this.createDecorations(state, finalConfig),
        }),
        apply: (tr, pluginState, _oldState, newState) => {
          // Only recompute if doc changed
          if (tr.docChanged) {
            return {
              decorations: this.createDecorations(newState, finalConfig),
            };
          }
          return pluginState;
        },
      },
      props: {
        decorations: (state) => {
          const pluginState = this.getState(state);
          return pluginState ? pluginState.decorations : null;
        },
      },
    });
  }

  private createDecorations(
    state: EditorState,
    config: Required<CodeWordDecorationsConfig>
  ) {
    const decorations: Decoration[] = [];
    const codeMarkType = state.schema.marks.code_inline;

    if (!codeMarkType) {
      return DecorationSet.empty;
    }

    state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        // Check if this text node has the code_inline mark
        const codeMark = node.marks.find((mark) => mark.type === codeMarkType);

        if (codeMark) {
          const text = node.text;

          // Split on spaces only rather than word breaks for code
          const words = text.split(" ");
          let currentPos = pos;

          for (let i = 0; i < words.length; i++) {
            const word = words[i];

            if (word.length > 0) {
              const wordStart = currentPos;
              const wordEnd = wordStart + word.length;

              // Create a decoration for each word
              decorations.push(
                Decoration.inline(wordStart, wordEnd, {
                  class: config.className,
                  nodeName: "span",
                })
              );
            }

            // Move position forward by word length + 1 for the space
            currentPos += word.length + 1;
          }
        }
      }
      return true;
    });

    return DecorationSet.create(state.doc, decorations);
  }
}

/**
 * Creates a plugin that decorates individual words inside inline code marks
 * with span elements.
 */
export function codeWordDecorations(config: CodeWordDecorationsConfig = {}) {
  return new CodeWordDecorationsPlugin(config);
}
