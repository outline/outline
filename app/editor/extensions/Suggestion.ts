import { escapeRegExp } from "es-toolkit/compat";
import { action, observable } from "mobx";
import { InputRule } from "prosemirror-inputrules";
import type { NodeType, Schema } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import type { ExtensionState } from "@shared/editor/plugins/SuggestionsMenuPlugin";
import {
  applyMatch,
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
  /**
   * Character or sequence (or list of them) that opens the suggestion menu.
   * All variants must be the same length.
   */
  trigger: string | string[];
  /**
   * Whether spaces are allowed within the search term. A space directly after
   * the trigger always closes the menu.
   */
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

    this.triggerLength = triggers[0].length;

    // A space is only meaningful once the search term is under way, so the
    // first character is always matched without one.
    const termChars = `\\p{L}/\\p{M}\\d\\.\\-–_`;
    const termPattern = this.options.allowSpaces
      ? `[${termChars}][${termChars}\\s]*`
      : `[${termChars}]+`;

    this.openRegex = new RegExp(
      `(?:^|\\s|\\(|\\+|[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}])${triggerPattern}(${termPattern})${
        this.options.requireSearchTerm ? "" : "?"
      }$`,
      "u"
    );
  }

  get plugins(): Plugin[] {
    return [
      new SuggestionsMenuPlugin(
        this.state,
        this.openRegex,
        this.enabledInMarks,
        this.triggerLength
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
        if (
          this.state.open &&
          (!this.options.allowSpaces || !this.state.query)
        ) {
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
          (this.enabledInMarks ||
            !isTriggerMarked(state, end, match, this.triggerLength))
        ) {
          // Input rules run while ProseMirror is reading a DOM change, at which
          // point its view descriptors are marked dirty and do not match the
          // DOM. Opening the menu here would render it – and measure the caret –
          // inside that window, so defer until the view has re-synced. The
          // cursor is read at that point too, as the typed character has not
          // been inserted yet when the rule runs.
          setTimeout(
            () =>
              applyMatch(this.state, match, {
                triggerLength: this.triggerLength,
                cursorPos: this.editor.view.state.selection.from,
                canOpen: true,
              }),
            0
          );
        }
        return null;
      }
    ),
  ];

  protected openRegex: RegExp;

  protected triggerLength: number;

  protected state: ExtensionState = observable({
    open: false,
    query: "",
    trigger: null,
    triggerPos: null,
  });

  /** Whether the suggestion menu is currently open. */
  get isOpen(): boolean {
    return this.state.open;
  }
}
