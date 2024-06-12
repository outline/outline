import { action, observable } from "mobx";
import { InputRule } from "prosemirror-inputrules";
import { NodeType, Schema } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { SuggestionsMenuPlugin } from "@shared/editor/plugins/Suggestions";
import { isInCode } from "@shared/editor/queries/isInCode";

export default class Suggestion extends Extension {
  state: {
    open: boolean;
    query: string;
  } = observable({
    open: false,
    query: "",
  });

  get plugins(): Plugin[] {
    return [new SuggestionsMenuPlugin(this.options, this.state)];
  }

  keys() {
    return {
      Backspace: action((state: EditorState) => {
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

        this.state.open = false;
        return false;
      }),
    };
  }

  inputRules = (_options: { type: NodeType; schema: Schema }) => [
    new InputRule(
      this.options.openRegex,
      action((state: EditorState, match: RegExpMatchArray) => {
        const { parent } = state.selection.$from;
        if (
          match &&
          (parent.type.name === "paragraph" ||
            parent.type.name === "heading") &&
          (!isInCode(state) || this.options.enabledInCode)
        ) {
          this.state.open = true;
          this.state.query = match[1];
        }
        return null;
      })
    ),
    new InputRule(
      this.options.closeRegex,
      action((_: EditorState, match: RegExpMatchArray) => {
        if (match) {
          this.state.open = false;
          this.state.query = "";
        }
        return null;
      })
    ),
  ];
}
