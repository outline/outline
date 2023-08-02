import { history, undo, redo } from "prosemirror-history";
import { undoInputRule } from "prosemirror-inputrules";
import Extension from "../lib/Extension";

export default class History extends Extension {
  get name() {
    return "history";
  }

  keys() {
    return {
      "Mod-z": undo,
      "Mod-y": redo,
      "Shift-Mod-z": redo,
      Backspace: undoInputRule,
    };
  }

  get plugins() {
    return [history()];
  }
}
