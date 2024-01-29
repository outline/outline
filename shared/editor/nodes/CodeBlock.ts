import CodeFence from "./CodeFence";

export default class CodeBlock extends CodeFence {
  get name() {
    return "code_block";
  }

  get markdownToken() {
    return "code_block";
  }
}
