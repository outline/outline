import { NodeAnchor, ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export class AnchorPlugin extends Plugin {
  constructor() {
    super({
      state: {
        init: (_, state: EditorState) => ({
          decorations: this.createDecorations(state),
        }),
        apply: (tr, pluginState, oldState, newState) => {
          // Only recompute if doc changed
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

  private createAnchorDecoration(anchor: NodeAnchor) {
    return Decoration.widget(
      anchor.pos,
      () => {
        const anchorElement = document.createElement("a");
        anchorElement.id = anchor.id;
        anchorElement.className = anchor.className;
        return anchorElement;
      },
      { side: -1, key: anchor.id }
    );
  }

  private createDecorations(state: EditorState) {
    const anchors = ProsemirrorHelper.getAnchors(state.doc);
    return DecorationSet.create(
      state.doc,
      anchors.map(this.createAnchorDecoration)
    );
  }
}

export const anchorPlugin = () => new AnchorPlugin();
