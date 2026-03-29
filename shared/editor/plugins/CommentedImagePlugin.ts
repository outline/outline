import type { EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Plugin that applies a light outline decoration to image nodes that have
 * comment marks, providing a visual indicator that the image has been commented
 * on.
 */
export class CommentedImagePlugin extends Plugin {
  constructor() {
    super({
      state: {
        init: (_, state: EditorState) => ({
          decorations: this.createDecorations(state),
        }),
        apply: (tr, pluginState, _oldState, newState) => {
          if (tr.docChanged) {
            return { decorations: this.createDecorations(newState) };
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

  private createDecorations(state: EditorState) {
    const decorations: Decoration[] = [];

    state.doc.descendants((node, pos) => {
      if (
        node.type.name === "image" &&
        Array.isArray(node.attrs.marks) &&
        node.attrs.marks.some(
          (mark: { type: string; attrs?: { resolved?: boolean } }) =>
            mark.type === "comment" && !mark.attrs?.resolved
        )
      ) {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            class: "image-commented",
          })
        );
      }
    });

    return DecorationSet.create(state.doc, decorations);
  }
}

export const commentedImagePlugin = () => new CommentedImagePlugin();
