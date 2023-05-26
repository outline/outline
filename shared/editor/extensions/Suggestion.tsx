import { InputRule } from "prosemirror-inputrules";
import { NodeType, Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { isInTable } from "prosemirror-tables";
import Extension from "../lib/Extension";
import { SuggestionsMenuPlugin } from "../plugins/Suggestions";
import isInCode from "../queries/isInCode";
import { EventType } from "../types";

export default class Suggestion extends Extension {
  get plugins(): Plugin[] {
    return [new SuggestionsMenuPlugin(this.editor, this.options)];
  }

  inputRules = (_options: { type: NodeType; schema: Schema }) => [
    new InputRule(this.options.openRegex, (state, match) => {
      if (
        match &&
        state.selection.$from.parent.type.name === "paragraph" &&
        (!isInCode(state) || this.options.enabledInCode) &&
        (!isInTable(state) || this.options.enabledInTable)
      ) {
        this.editor.events.emit(EventType.SuggestionsMenuOpen, {
          type: this.options.type,
          query: match[1],
        });
      }
      return null;
    }),
    new InputRule(this.options.closeRegex, (state, match) => {
      if (match) {
        this.editor.events.emit(
          EventType.SuggestionsMenuClose,
          this.options.type
        );
      }
      return null;
    }),
  ];
}
