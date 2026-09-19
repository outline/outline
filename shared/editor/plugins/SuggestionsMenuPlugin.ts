import { action, reaction } from "mobx";
import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { Decoration, DecorationSet } from "prosemirror-view";
import { mapDecorations } from "@shared/editor/lib/multiplayer";
import { getMarksBetween } from "@shared/editor/queries/getMarksBetween";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";

const MAX_MATCH = 500;

interface PluginState {
  decorations: DecorationSet;
}

/** The document range covered by the trigger and its search term. */
interface TriggerRange {
  from: number;
  to: number;
}

export type ExtensionState = {
  open: boolean;
  query: string;
  /** The trigger that opened the menu, if it was opened by one. */
  trigger: string | null;
  /** The document position of the trigger at the time it was matched. */
  triggerPos: number | null;
};

/**
 * Determine whether the trigger character of a suggestion match carries any
 * marks (e.g. bold, code, link).
 *
 * @param state The editor state.
 * @param cursorPos The document position of the cursor (end of the match).
 * @param match The regex match where group 1 is the search term.
 * @param triggerLength The length of the trigger in characters.
 * @returns True if the trigger character has one or more marks applied.
 */
export function isTriggerMarked(
  state: EditorState,
  cursorPos: number,
  match: RegExpMatchArray,
  triggerLength: number
): boolean {
  const queryLength = match[1]?.length ?? 0;
  const triggerEnd = cursorPos - queryLength;
  const triggerStart = triggerEnd - triggerLength;
  if (triggerStart < 0) {
    return false;
  }
  return getMarksBetween(triggerStart, triggerEnd, state).length > 0;
}

/**
 * Update the extension state to reflect a suggestion match.
 *
 * @param extensionState The state to update.
 * @param match The regex match where group 1 is the search term.
 * @param options The trigger length, the cursor position at the end of the
 * match, and whether the menu may be opened by this match.
 */
export const applyMatch = action(
  (
    extensionState: ExtensionState,
    match: RegExpMatchArray,
    options: { triggerLength: number; cursorPos: number; canOpen: boolean }
  ) => {
    const { triggerLength, cursorPos, canOpen } = options;
    const query = match[1] ?? "";
    const triggerEnd = match[0].length - query.length;

    // The menu only opens on a freshly typed trigger, that is a match made up
    // of the optional preceding character and the trigger itself.
    if (canOpen && match[0].length <= triggerLength + 1) {
      extensionState.open = true;
    }
    extensionState.query = query;
    extensionState.trigger = match[0].slice(
      triggerEnd - triggerLength,
      triggerEnd
    );
    extensionState.triggerPos = cursorPos - query.length - triggerLength;
  }
);

export class SuggestionsMenuPlugin extends Plugin<PluginState> {
  constructor(
    extensionState: ExtensionState,
    openRegex: RegExp,
    enabledInMarks: boolean,
    triggerLength: number
  ) {
    const key = new PluginKey<PluginState>("suggestions-menu");

    super({
      key,
      // The decoration is held in plugin state so that it is mapped through
      // changes to the document, including those made by other users.
      state: {
        init: (): PluginState => ({ decorations: DecorationSet.empty }),
        apply: (tr, pluginState, _oldState, newState): PluginState => {
          const range: TriggerRange | undefined | null = tr.getMeta(key);

          if (range !== undefined) {
            return {
              decorations: range
                ? DecorationSet.create(tr.doc, [
                    // The end is inclusive so that the decoration grows as the
                    // search term is typed.
                    Decoration.inline(
                      range.from,
                      range.to,
                      { class: EditorStyleHelper.suggestionTrigger },
                      { inclusiveEnd: true }
                    ),
                  ])
                : DecorationSet.empty,
            };
          }

          if (
            !tr.docChanged ||
            pluginState.decorations === DecorationSet.empty
          ) {
            return pluginState;
          }

          const decorations = mapDecorations(
            pluginState.decorations,
            tr,
            newState
          );
          const [decoration] = decorations.find();
          const { trigger } = extensionState;

          // The trigger itself may have been edited away, for example by
          // another user, leaving nothing to decorate.
          if (
            !trigger ||
            !decoration ||
            decoration.to - decoration.from < trigger.length ||
            tr.doc.textBetween(
              decoration.from,
              decoration.from + trigger.length
            ) !== trigger
          ) {
            return { decorations: DecorationSet.empty };
          }

          return { decorations };
        },
      },
      // The menu state lives outside of the editor state, so ProseMirror is not
      // otherwise aware that the decoration needs adding or removing.
      view: (view) => {
        const dispose = reaction(
          () => [
            extensionState.open,
            extensionState.trigger,
            extensionState.triggerPos,
          ],
          () => {
            // Avoid interrupting an in-progress IME composition, the decoration
            // will be added once the composition is committed.
            if (view.composing) {
              return;
            }

            const setRange = (range: TriggerRange | null) =>
              view.dispatch(
                view.state.tr.setMeta(key, range).setMeta("addToHistory", false)
              );

            const { open, query, trigger, triggerPos } = extensionState;
            if (!open || trigger === null || triggerPos === null) {
              setRange(null);
              return;
            }

            const to = triggerPos + trigger.length + query.length;
            setRange(
              to <= view.state.doc.content.size
                ? { from: triggerPos, to }
                : null
            );
          }
        );
        return { destroy: dispose };
      },
      props: {
        decorations: (state) => key.getState(state)?.decorations,
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
              if (
                match &&
                (enabledInMarks ||
                  !isTriggerMarked(state, fromPos, match, triggerLength))
              ) {
                applyMatch(extensionState, match, {
                  triggerLength,
                  cursorPos: fromPos,
                  canOpen: true,
                });
              }
            }, 0);
            return false;
          },
        },
        handleKeyDown: (view, event) => {
          // Prosemirror input rules are not triggered on backspace, however
          // we need them to be evaluated for the filter trigger to work
          // correctly. This additional handler adds inputrules-like handling.
          if (event.key === "Backspace") {
            // timeout ensures that the delete has been handled by prosemirror
            // and any characters removed, before we evaluate the rule.
            setTimeout(() => {
              const { pos: fromPos } = view.state.selection.$from;
              this.execute(
                view,
                fromPos,
                fromPos,
                openRegex,
                action((state, match) => {
                  if (
                    match &&
                    (enabledInMarks ||
                      !isTriggerMarked(state, fromPos, match, triggerLength))
                  ) {
                    applyMatch(extensionState, match, {
                      triggerLength,
                      cursorPos: fromPos,
                      canOpen: false,
                    });
                  } else {
                    extensionState.open = false;
                  }
                  return null;
                })
              );
            }, 0);
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
                (state, match) => {
                  if (
                    match &&
                    (enabledInMarks ||
                      !isTriggerMarked(state, fromPos, match, triggerLength))
                  ) {
                    applyMatch(extensionState, match, {
                      triggerLength,
                      cursorPos: fromPos,
                      canOpen: true,
                    });
                  }
                  return null;
                }
              );
            }, 0);
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
    const result = handler(
      state,
      match,
      match ? from - match[0].length : from,
      to
    );
    if (!result) {
      return false;
    }
    return true;
  }
}
