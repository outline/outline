import escapeRegExp from "lodash/escapeRegExp";
import { action, observable } from "mobx";
import { InputRule } from "prosemirror-inputrules";
import type { NodeType, Schema } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { SuggestionsMenuPlugin } from "@shared/editor/plugins/SuggestionsMenuPlugin";
import { isInCode } from "@shared/editor/queries/isInCode";

type Options = {
  enabledInCode: boolean;
  trigger: string | string[];
  allowSpaces: boolean;
  requireSearchTerm: boolean;
};

export default class Suggestion extends Extension {
  constructor(options: Options) {
    super(options);

    const triggers = Array.isArray(this.options.trigger)
      ? this.options.trigger
      : [this.options.trigger];
    const triggerPattern =
      triggers.length === 1
        ? escapeRegExp(triggers[0])
        : `(?:${triggers.map(escapeRegExp).join("|")})`;

    this.openRegex = new RegExp(
      `(?:^|\\s|\\(|[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}])${triggerPattern}(${`[\\p{L}\/\\p{M}\\d${
        this.options.allowSpaces ? "\\s{1}" : ""
      }\\.\\-–_]+`})${this.options.requireSearchTerm ? "" : "?"}$`,
      "u"
    );
  }

  get plugins(): Plugin[] {
    return [new SuggestionsMenuPlugin(this.state, this.openRegex)];
  }

  keys() {
    return {
      Space: action(() => {
        if (this.state.open && !this.options.allowSpaces) {
          this.state.open = false;
        }
        return false;
      }),
    };
  }

  inputRules = (_options: { type: NodeType; schema: Schema }) => [
    new InputRule(
      this.openRegex,
      action((state: EditorState, match: RegExpMatchArray) => {
        const { parent } = state.selection.$from;
        if (
          match &&
          (parent.type.name === "paragraph" ||
            parent.type.name === "heading") &&
          (!isInCode(state) || this.options.enabledInCode)
        ) {
          if (match[0].length <= 2) {
            this.state.open = true;
          }
          this.state.query = match[1];
        }
        return null;
      })
    ),
  ];

  protected openRegex: RegExp;

  protected state: {
    open: boolean;
    query: string;
  } = observable({
    open: false,
    query: "",
  });

  /** Whether the suggestion menu is currently open. */
  get isOpen(): boolean {
    return this.state.open;
  }
}
