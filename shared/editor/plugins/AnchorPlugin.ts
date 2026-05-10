import type { NodeAnchor } from "@shared/utils/ProsemirrorHelper";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import type { Node } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { changedDescendants } from "../lib/changedDescendants";
import { isRemoteTransaction } from "../lib/multiplayer";

export class AnchorPlugin extends Plugin {
  constructor() {
    super({
      state: {
        init: (_, state: EditorState) => ({
          decorations: this.createDecorations(state),
        }),
        apply: (tr, pluginState, _oldState, newState) => {
          if (!tr.docChanged) {
            return pluginState;
          }

          if (isRemoteTransaction(tr) || this.hasAnchorableChange(tr)) {
            return { decorations: this.createDecorations(newState) };
          }

          return {
            decorations: pluginState.decorations.map(tr.mapping, tr.doc),
          };
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

  private isAnchorable(node: Node): boolean {
    return (
      node.type.name === "heading" ||
      (Array.isArray(node.attrs.marks) &&
        node.attrs.marks.some(
          (mark: { type: string; attrs?: { id?: string } }) =>
            mark.type === "comment" && mark.attrs?.id
        ))
    );
  }

  /**
   * Check if the transaction changed any heading or image-with-comment-mark
   * nodes by comparing changed descendants in both directions.
   */
  private hasAnchorableChange(tr: Transaction): boolean {
    let found = false;
    const check = (node: Node) => {
      if (!found && this.isAnchorable(node)) {
        found = true;
      }
    };

    changedDescendants(tr.before, tr.doc, 0, check);
    if (!found) {
      changedDescendants(tr.doc, tr.before, 0, check);
    }
    return found;
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
