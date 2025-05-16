import filter from "lodash/filter";
import find from "lodash/find";
import map from "lodash/map";
import { Node } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

type Config = Array<{
  /** Condition to meet for the placeholder to be applied to a node */
  cond: (
    /** Node to which the placeholder is expected to be applied */
    node: Node,
    /** Position of node to which the placeholder is expected to be applied */
    pos: number,
    /** Parent of node to which the placeholder is expected to be applied */
    parent: Node | null,
    state: EditorState
  ) => boolean;
  /** Placeholder text */
  text: string;
}>;

export class PlaceholderPlugin extends Plugin {
  private config: Config;

  constructor(config: Config) {
    super({
      props: {
        decorations: (state) => {
          const decorations: Decoration[] = map(
            this.placeholders(state),
            (placeholder) =>
              Decoration.node(
                placeholder.pos,
                placeholder.pos + placeholder.node.nodeSize,
                {
                  class: "placeholder",
                  "data-empty-text": placeholder.text,
                }
              )
          );
          return DecorationSet.create(state.doc, decorations);
        },
      },
    });
    this.config = config;
  }

  private placeholders(state: EditorState) {
    const paras: Array<{
      node: Node;
      pos: number;
      parent: Node | null;
    }> = [];
    state.doc.descendants((node, pos, parent) => {
      if (node.type.name === "paragraph") {
        paras.push({ node, pos, parent });
      }
    });
    return filter(
      map(paras, (para) => {
        const condMet = find(this.config, (conf) =>
          conf.cond(para.node, para.pos, para.parent, state)
        );

        return condMet
          ? {
              node: para.node,
              pos: para.pos,
              text: condMet.text,
            }
          : undefined;
      }),
      (placeholder) => placeholder !== undefined
    );
  }
}
