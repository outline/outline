import { NodeSpec } from "prosemirror-model";
import Node from "./Node";

export default class TableRow extends Node {
  get name() {
    return "tr";
  }

  get schema(): NodeSpec {
    return {
      content: "(th | td)*",
      tableRole: "row",
      parseDOM: [{ tag: "tr" }],
      toDOM() {
        return ["tr", 0];
      },
    };
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return { block: "tr" };
  }
}
