import { NodeSpec, NodeType } from "prosemirror-model";
import toggleWrap from "../commands/toggleWrap";
import Node from "./Node";

export default class ToggleBlock extends Node {
  get name() {
    return "toggle_block";
  }

  get schema(): NodeSpec {
    return {
      content: "toggle_head toggle_body?",
      group: "block",
      toDOM: () => {
        const dom = document.createElement("div");
        const contentDOM = dom;

        return { dom, contentDOM };
      },
    };
  }

  commands({ type }: { type: NodeType }) {
    return () => toggleWrap(type);
  }
}
