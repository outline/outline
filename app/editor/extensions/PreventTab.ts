import { Command } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";

export default class PreventTab extends Extension {
  get name() {
    return "preventTab";
  }

  keys(): Record<string, Command> {
    return {
      // No-ops prevent Tab escaping the editor bounds
      Tab: () => true,
      "Shift-Tab": () => true,
    };
  }
}
