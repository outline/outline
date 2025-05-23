import isNull from "lodash/isNull";
import { NodeSpec } from "prosemirror-model";
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
          condition: ({ $start, parent, state, textContent }) =>
            textContent === "" &&
            !isNull(parent) &&
            parent.type === state.doc.type &&
            parent.childCount === 1 &&
            $start.index($start.depth - 1) === 0,
          text: this.options.placeholder,
        },
      ]),
    ];
  }
}
