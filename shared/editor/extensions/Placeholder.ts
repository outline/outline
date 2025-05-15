import filter from "lodash/filter";
import find from "lodash/find";
import map from "lodash/map";
import { Node } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "../lib/Extension";

export default class Placeholder extends Extension {
  get name() {
    return "empty-placeholder";
  }

  get defaultOptions() {
    return {
      emptyNodeClass: "placeholder",
      placeholder: "",
    };
  }

  get plugins() {
    const plugin = new Plugin({
      config: [
        {
          cond: (node: Node, pos: number, parent: Node, state: EditorState) => {
            const $start = state.doc.resolve(pos + 1);
            return (
              !node.textContent &&
              parent.type === state.doc.type &&
              parent.childCount === 1 &&
              $start.index($start.depth - 1) === 0
            );
          },
          text: this.options.placeholder,
        },
        {
          cond: (node: Node, pos: number, parent: Node, state: EditorState) => {
            const $start = state.doc.resolve(pos + 1);
            return (
              $start.depth === 1 &&
              !node.textContent &&
              state.doc.textContent &&
              state.selection.$from.pos === $start.pos + node.content.size
            );
          },
          text: this.options.dictionary.newLineEmpty,
        },
        {
          cond: (node: Node, pos: number, parent: Node, state: EditorState) => {
            const $start = state.doc.resolve(pos + 1);
            return (
              $start.depth === 1 &&
              node.textContent === "/" &&
              state.selection.$from.pos === $start.pos + node.content.size
            );
          },
          text: `  ${this.options.dictionary.newLineWithSlash}`,
        },
      ],
      props: {
        decorations: (state) => {
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
          const placeholders = filter(
            map(paras, (para) => {
              const condMet = find(plugin.spec.config, (conf) =>
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
          const decorations: Decoration[] = map(placeholders, (placeholder) =>
            Decoration.node(
              placeholder.pos,
              placeholder.pos + placeholder.node.nodeSize,
              {
                class: this.options.emptyNodeClass,
                "data-empty-text": placeholder.text,
              }
            )
          );
          return DecorationSet.create(state.doc, decorations);
        },
      },
    });
    return [plugin];
  }
}
