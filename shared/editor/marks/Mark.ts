import { toggleMark } from "prosemirror-commands";
import Extension from "../lib/Extension";

export default abstract class Mark extends Extension {
  get type() {
    return "mark";
  }

  abstract get schema();

  get markdownToken(): string {
    return "";
  }

  get toMarkdown(): Record<string, any> {
    return {};
  }

  parseMarkdown() {
    return {};
  }

  commands({ type }) {
    return () => toggleMark(type);
  }
}
