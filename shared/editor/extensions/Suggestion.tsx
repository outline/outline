import { InputRule } from "prosemirror-inputrules";
import { NodeType, Schema } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { isInTable } from "prosemirror-tables";
import Extension from "../lib/Extension";
import { SuggestionsMenuPlugin } from "../plugins/Suggestions";
import isInCode from "../queries/isInCode";
import { EventType } from "../types";

export default class Suggestion extends Extension {
  get plugins(): Plugin[] {
    return [new SuggestionsMenuPlugin(this.editor, this.options)];
  }

  keys() {
    return {
      Backspace: (state: EditorState) => {
        const { $from } = state.selection;
        const textBefore = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - 500), // 500 = max match
          Math.max(0, $from.parentOffset - 1), // 1 = account for deleted character
          null,
          "\ufffc"
        );

        if (this.options.openRegex.test(textBefore)) {
          return false;
        }

        this.editor.events.emit(
          EventType.SuggestionsMenuClose,
          this.options.type
        );
        return false;
      },
    };
  }

  inputRules = (_options: { type: NodeType; schema: Schema }) => [
    new InputRule(this.options.openRegex, (state, match) => {
      const { parent } = state.selection.$from;
      if (
        match &&
        (parent.type.name === "paragraph" || parent.type.name === "heading") &&
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
