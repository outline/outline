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

  keys(): Record<string, Command | CommandFactory> {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Mod-y": () => this.editor.commands.redo(),
      "Shift-Mod-z": () => this.editor.commands.redo(),
      Backspace: undoInputRule,
    };
  }

  get plugins() {
    return [history()];
  }
}
