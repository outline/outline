import filter from "lodash/filter";
import find from "lodash/find";
import map from "lodash/map";
import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

type Config = Array<{
  /** Condition to meet for the placeholder to be applied to a node */
  condition: (
    /** Node to which the placeholder is expected to be applied */
    node: Node,
    /** Resolved position corresponding to start of node */
    $start: ResolvedPos,
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
              Decoration.node(placeholder.from, placeholder.to, {
                class: "placeholder",
                "data-empty-text": placeholder.text,
              })
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
      $start: ResolvedPos;
      parent: Node | null;
    }> = [];
    state.doc.descendants((node, pos, parent) => {
      if (node.type.name === "paragraph") {
        paras.push({ node, $start: state.doc.resolve(pos + 1), parent });
      }
    });
    return filter(
      map(paras, (para) => {
        const condMet = find(this.config, (conf) =>
          conf.condition(para.node, para.$start, para.parent, state)
        );

        return condMet
          ? {
              from: para.$start.pos - 1,
              to: para.$start.pos - 1 + para.node.nodeSize,
              text: condMet.text,
            }
          : undefined;
      }),
      (placeholder) => placeholder !== undefined
    );
  }
}
