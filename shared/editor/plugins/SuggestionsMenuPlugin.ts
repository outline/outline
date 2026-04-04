import { action } from "mobx";
import type { EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

const MAX_MATCH = 500;

type Options = {
  openRegex: RegExp;
  closeRegex: RegExp;
  enabledInCode: boolean;
  trigger: string;
  allowSpaces: boolean;
  requireSearchTerm: boolean;
};

type ExtensionState = {
  open: boolean;
  query: string;
};

export class SuggestionsMenuPlugin extends Plugin {
  constructor(
    options: Options,
    extensionState: ExtensionState,
    openRegex: RegExp
  ) {
    super({
      props: {
        handleDOMEvents: {
          // IME composition (e.g. Korean, Japanese, Chinese) fires compositionupdate
          // as each character is being built up. ProseMirror's view.composing flag
          // blocks the normal handleKeyDown path, so we handle it separately here.
          compositionupdate: (view) => {
            setTimeout(() => {
              const { pos: fromPos } = view.state.selection.$from;
              const state = view.state;
              const $from = state.doc.resolve(fromPos);
              if ($from.parent.type.spec.code) {
                return;
              }
              const textBefore = $from.parent.textBetween(
                Math.max(0, $from.parentOffset - MAX_MATCH),
                $from.parentOffset,
                undefined,
                "\ufffc"
              );
              const match = openRegex.exec(textBefore);
              action(() => {
                if (match) {
                  if (match[0].length <= 2) {
                    extensionState.open = true;
                  }
                  extensionState.query = match[1];
                }
              })();
            });
            return false;
          },
        },
        handleKeyDown: (view, event) => {
          // Prosemirror input rules are not triggered on backspace, however
          // we need them to be evaluted for the filter trigger to work
          // correctly. This additional handler adds inputrules-like handling.
          if (event.key === "Backspace") {
            // timeout ensures that the delete has been handled by prosemirror
            // and any characters removed, before we evaluate the rule.
            setTimeout(() => {
              const { pos: fromPos } = view.state.selection.$from;
              return this.execute(
                view,
                fromPos,
                fromPos,
                openRegex,
                action((_, match) => {
                  if (match) {
                    extensionState.query = match[1];
                  } else {
                    extensionState.open = false;
                  }
                  return null;
                })
              );
            });
          }

          // Another plugin (e.g. the Placeholder mark) may consume the
          // handleTextInput event by returning true, which prevents the
          // InputRule from evaluating the trigger character. We use a timeout
          // here so the re-evaluation happens after all synchronous handlers
          // have run, ensuring the suggestion menu still opens in those cases.
          if (
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            event.key.length === 1
          ) {
            setTimeout(() => {
              const { pos: fromPos } = view.state.selection.$from;
              this.execute(
                view,
                fromPos,
                fromPos,
                openRegex,
                action((_, match) => {
                  if (match) {
                    if (match[0].length <= 2) {
                      extensionState.open = true;
                    }
                    extensionState.query = match[1];
                  }
                  return null;
                })
              );
            });
          }

          // If the menu is open then just ignore the key events in the editor
          // itself until we're done.
          if (
            event.key === "Enter" ||
            event.key === "ArrowUp" ||
            event.key === "ArrowDown" ||
            event.key === "Tab"
          ) {
            return extensionState.open;
          }

          return false;
        },
      },
    });
  }

  // based on the input rules code in Prosemirror, here:
  // https://github.com/ProseMirror/prosemirror-inputrules/blob/master/src/inputrules.js
  private execute(
    view: EditorView,
    from: number,
    to: number,
    regex: RegExp,
    handler: (
      state: EditorState,
      match: RegExpExecArray | null,
      from?: number,
      to?: number
    ) => boolean | null
  ) {
    if (view.composing) {
      return false;
    }
    const state = view.state;
    const $from = state.doc.resolve(from);
    if ($from.parent.type.spec.code) {
      return false;
    }

    const textBefore = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - MAX_MATCH),
      $from.parentOffset,
      undefined,
      "\ufffc"
    );

    const match = regex.exec(textBefore);
    const tr = handler(state, match, match ? from - match[0].length : from, to);
    if (!tr) {
      return false;
    }
    return true;
  }
}
