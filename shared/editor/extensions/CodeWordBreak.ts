import { codeWordDecorations } from "../plugins/CodeWordDecorationsPlugin";
import Extension from "../lib/Extension";

export default class CodeWordBreak extends Extension {
  get name() {
    return "codeWordBreak";
  }

  get plugins() {
    return [codeWordDecorations()];
  }
}
