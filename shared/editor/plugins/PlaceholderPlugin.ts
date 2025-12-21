import filter from "lodash/filter";
import find from "lodash/find";
import map from "lodash/map";
import type { Node, ResolvedPos } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

type Config = Array<{
  /** Condition to meet for the placeholder to be applied to a node */
  condition: (args: {
    /** Node to which the placeholder is expected to be applied */
    node: Node;
    /** Resolved position corresponding to start of node */
    $start: ResolvedPos;
    /** Parent of node to which the placeholder is expected to be applied */
    parent: Node | null;
    /** Current editor state */
    state: EditorState;
    /** Text content of the document */
    textContent: string;
  }) => boolean;
  /** Placeholder text */
  text: string;
}>;

export class PlaceholderPlugin extends Plugin {
  constructor(config: Config) {
    super({
      state: {
        init: (_, state: EditorState) => ({
          decorations: this.createDecorations(state, config),
        }),
        apply: (tr, pluginState, oldState, newState) => {
          // Only recompute if doc or selection changed
          if (tr.docChanged || tr.selectionSet) {
            return { decorations: this.createDecorations(newState, config) };
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

  private createDecorations(state: EditorState, config: Config) {
    const paras: Array<{
      node: Node;
      $start: ResolvedPos;
      parent: Node | null;
    }> = [];
    state.doc.descendants((node, pos, parent) => {
      if (node.type.name === "paragraph") {
        paras.push({ node, $start: state.doc.resolve(pos + 1), parent });
        return false;
      }
      return true;
    });

    const textContent = state.doc.textContent;
    const decorations: Decoration[] = filter(
      map(paras, (para) => {
        const condMet = find(config, (conf) =>
          conf.condition({
            node: para.node,
            $start: para.$start,
            parent: para.parent,
            state,
            textContent,
          })
        );
        return condMet
          ? Decoration.node(
              para.$start.pos - 1,
              para.$start.pos - 1 + para.node.nodeSize,
              {
                class: "placeholder",
                "data-empty-text": condMet.text,
              }
            )
          : undefined;
      }),
      (decoration) => decoration !== undefined
    );
    return DecorationSet.create(state.doc, decorations);
  }
}
