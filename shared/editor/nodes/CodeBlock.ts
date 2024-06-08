import { NodeType } from "prosemirror-model";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import { selectAll } from "../commands/selectAll";
import CodeFence from "./CodeFence";

export default class CodeBlock extends CodeFence {
  get name() {
    return "code_block";
  }

  get markdownToken() {
    return "code_block";
  }

  keys({ type }: { type: NodeType }) {
    return {
      Backspace: backspaceToParagraph(type),
      "Mod-a": selectAll(type),
    };
  }
}
