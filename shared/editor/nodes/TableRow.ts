import Node from "./Node";

export default class TableRow extends Node {
  get name() {
    return "tr";
  }

  get schema() {
    return {
      content: "(th | td)*",
      tableRole: "row",
      parseDOM: [{ tag: "tr" }],
      toDOM() {
        return ["tr", 0];
      },
    };
  }

  parseMarkdown() {
    return { block: "tr" };
  }
}
