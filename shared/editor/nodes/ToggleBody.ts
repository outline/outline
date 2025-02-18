import { NodeSpec } from "prosemirror-model";
import Node from "./Node";

export default class ToggleBody extends Node {
  get name() {
    return "toggle_body";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      toDOM: () => {
        const dom = document.createElement("div");
        dom.classList.add("toggle-body");
        const contentDOM = dom;

        return { dom, contentDOM };
      },
    };
  }
}
