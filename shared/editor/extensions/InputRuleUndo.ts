import { undoInputRule } from "prosemirror-inputrules";
import type { Command } from "prosemirror-state";
import Extension from "../lib/Extension";

export default class InputRuleUndo extends Extension {
  get name() {
    return "inputRuleUndo";
  }

  keys(): Record<string, Command> {
    return {
      Backspace: undoInputRule,
    };
  }
}
