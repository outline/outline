import isNull from "lodash/isNull";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { PlaceholderPlugin } from "../plugins/PlaceholderPlugin";
import Node from "./Node";

export default class Doc extends Node {
  get name() {
    return "doc";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
    };
  }

  get plugins() {
    return [
      new PlaceholderPlugin([
        {
          cond: (
            node: ProsemirrorNode,
            pos: number,
            parent: ProsemirrorNode | null,
            state: EditorState
          ) => {
            const $start = state.doc.resolve(pos + 1);
            return (
              node.textContent === "" &&
              !isNull(parent) &&
              parent.type === state.doc.type &&
              parent.childCount === 1 &&
              $start.index($start.depth - 1) === 0
            );
          },
          text: this.options.placeholder,
        },
      ]),
    ];
  }
}
