import { action } from "mobx";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

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
