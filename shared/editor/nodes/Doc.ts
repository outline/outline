import Node from "./Node";

export default class Doc extends Node {
  get name() {
    return "doc";
  }

  get schema() {
    return {
      content: "block+",
    };
  }
}
