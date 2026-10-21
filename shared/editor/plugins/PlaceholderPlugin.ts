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
    /** Whether the document has no text content, evaluated lazily */
    isDocEmpty: boolean;
  }) => boolean;
  /** Placeholder text */
  text: string;
}>;

/**
 * The largest content size of a node that any placeholder condition can match.
 * Conditions only ever target empty textblocks or a lone "/" character.
 */
const MAX_CANDIDATE_SIZE = 1;

export class PlaceholderPlugin extends Plugin {
  /**
   * @param config Placeholder conditions to evaluate against candidate nodes.
   * @param nodeTypes Names of the node types eligible for a placeholder.
   * Defaults to paragraphs only.
   */
  constructor(config: Config, nodeTypes: string[] = ["paragraph"]) {
    super({
      state: {
        init: (_, state: EditorState) => ({
          decorations: this.createDecorations(state, config, nodeTypes),
        }),
        apply: (tr, pluginState, oldState, newState) => {
          // Only recompute if doc or selection changed
          if (tr.docChanged || tr.selectionSet) {
            return {
              decorations: this.createDecorations(newState, config, nodeTypes),
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
    config: Config,
    nodeTypes: string[]
  ) {
    const decorations: Decoration[] = [];
    let isDocEmpty: boolean | undefined;

    state.doc.descendants((node, pos, parent) => {
      if (!nodeTypes.includes(node.type.name)) {
        return true;
      }
      if (node.content.size > MAX_CANDIDATE_SIZE) {
        return false;
      }

      const $start = state.doc.resolve(pos + 1);
      const args = {
        node,
        $start,
        parent,
        state,
        get isDocEmpty() {
          isDocEmpty ??= isEmpty(state.doc);
          return isDocEmpty;
        },
      };
      const condMet = config.find((conf) => conf.condition(args));

      if (condMet) {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            class: "placeholder",
            "data-empty-text": condMet.text,
          })
        );
      }
      return false;
    });

    return DecorationSet.create(state.doc, decorations);
  }
}

/**
 * Whether the document has no text content. Equivalent to checking that
 * `doc.textContent` is empty, but stops at the first text-producing node
 * instead of building a string of the whole document.
 */
function isEmpty(doc: Node): boolean {
  let empty = true;
  doc.descendants((node) => {
    if (!empty) {
      return false;
    }
    if (node.isText) {
      empty = !node.text;
    } else if (node.isLeaf && node.type.spec.leafText) {
      empty = !node.type.spec.leafText(node);
    }
    return empty;
  });
  return empty;
}
