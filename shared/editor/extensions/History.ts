import { history, undo, redo } from "prosemirror-history";
import { undoInputRule } from "prosemirror-inputrules";
import { Command } from "prosemirror-state";
import Extension, { CommandFactory } from "../lib/Extension";

export default class History extends Extension {
  get name() {
    return "history";
  }

  commands(): Record<string, CommandFactory> {
    return {
      undo: () => undo,
      redo: () => redo,
    };
  }

  keys(): Record<string, Command> {
    return {
      "Mod-z": (state, dispatch) =>
        this.editor.commands.undo()(state, dispatch),
      "Mod-y": (state, dispatch) =>
        this.editor.commands.redo()(state, dispatch),
      "Shift-Mod-z": (state, dispatch) =>
        this.editor.commands.redo()(state, dispatch),
      Backspace: undoInputRule,
    };
  }

  get plugins() {
    return [history()];
  }
}
