import { escapeRegExp } from "es-toolkit/compat";
import { action, observable } from "mobx";
import { InputRule } from "prosemirror-inputrules";
import type { NodeType, Schema } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import {
  isTriggerMarked,
  SuggestionsMenuPlugin,
} from "@shared/editor/plugins/SuggestionsMenuPlugin";
import { isInCode } from "@shared/editor/queries/isInCode";

/**
 * Options shared by all suggestion-style extensions (block menu, emoji menu,
 * mention menu).
 */
export type SuggestionOptions = {
  /** Whether the suggestion menu is allowed to open inside code blocks or inline code. */
  enabledInCode: boolean;
  /**
   * Whether the suggestion menu may open when the trigger character carries a
   * mark (e.g. bold, italic, link). Defaults to true – disable for menus where
   * the trigger is only meaningful as plain text, such as the block menu.
   */
  enabledInMarks?: boolean;
  /** Character (or list of characters) that opens the suggestion menu. */
  trigger: string | string[];
  /** Whether spaces are allowed inside the search term. */
  allowSpaces: boolean;
  /** Whether the menu only opens once at least one character has been typed after the trigger. */
  requireSearchTerm: boolean;
};

export default class Suggestion<
  TOptions extends SuggestionOptions = SuggestionOptions,
> extends Extension<TOptions> {
  constructor(options: TOptions) {
    super(options);

    const triggers = Array.isArray(this.options.trigger)
      ? this.options.trigger
      : [this.options.trigger];
    const triggerPattern =
      triggers.length === 1
        ? escapeRegExp(triggers[0])
        : `(?:${triggers.map(escapeRegExp).join("|")})`;

    this.openRegex = new RegExp(
      `(?:^|\\s|\\(|\\+|[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}])${triggerPattern}(${`[\\p{L}/\\p{M}\\d${
        this.options.allowSpaces ? "\\s{1}" : ""
      }\\.\\-–_]+`})${this.options.requireSearchTerm ? "" : "?"}$`,
      "u"
    );
  }

  get plugins(): Plugin[] {
    return [
      new SuggestionsMenuPlugin(
        this.state,
        this.openRegex,
        this.enabledInMarks
      ),
    ];
  }

  /** Whether the menu may open when the trigger character carries a mark. */
  protected get enabledInMarks(): boolean {
    return this.options.enabledInMarks ?? true;
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
      (
        state: EditorState,
        match: RegExpMatchArray,
        _start: number,
        end: number
      ) => {
        const { parent } = state.selection.$from;
        if (
          match &&
          (parent.type.name === "paragraph" ||
            parent.type.name === "heading") &&
          (!isInCode(state) || this.options.enabledInCode) &&
          (this.enabledInMarks || !isTriggerMarked(state, end, match))
        ) {
          const open = match[0].length <= 2;
          const query = match[1];

          // Input rules run while ProseMirror is reading a DOM change, at which
          // point its view descriptors are marked dirty and do not match the
          // DOM. Opening the menu here would render it – and measure the caret –
          // inside that window, so defer until the view has re-synced.
          setTimeout(
            action(() => {
              if (open) {
                this.state.open = true;
              }
              this.state.query = query;
            }),
            0
          );
        }
        return null;
      }
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
