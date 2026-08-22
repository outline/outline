import type { EditorState, Transaction } from "prosemirror-state";
import { PluginKey } from "prosemirror-state";
import type { DecorationSet } from "prosemirror-view";
import { recreateTransform } from "./prosemirror-recreate-transform";

/**
 * State of the facade plugin mounted by the multiplayer extension. It exposes
 * the collaboration operations to shared code without a static dependency on
 * the collaboration libraries.
 */
export interface MultiplayerState {
  /** Returns true if the transaction originated from a remote client. */
  isRemoteTransaction: (tr: Transaction) => boolean;
  /** Stops the collaborative undo manager from capturing further changes. */
  stopCapturing: (state: EditorState) => void;
}

/**
 * Key of the facade plugin mounted by the multiplayer extension.
 */
export const multiplayerPluginKey = new PluginKey<MultiplayerState>(
  "multiplayer-facade"
);

/**
 * Checks if a transaction is a remote transaction
 *
 * @param tr The Prosemirror transaction
 * @param state The editor state
 * @returns true if the transaction is a remote transaction
 */
export function isRemoteTransaction(
  tr: Transaction,
  state: EditorState
): boolean {
  return multiplayerPluginKey.getState(state)?.isRemoteTransaction(tr) ?? false;
}

/**
 * Stops the collaborative undo manager from capturing further changes, if
 * the multiplayer extension is mounted in the editor.
 *
 * @param state The editor state
 */
export function stopCapturingUndo(state: EditorState): void {
  multiplayerPluginKey.getState(state)?.stopCapturing(state);
}

/**
 * Map the set of decorations in response to a change in the document.
 *
 * @param set The current set of decorations
 * @param tr The Prosemirror transaction
 * @param state The editor state
 * @param force Whether to force recalculation for map even for local transactions
 * @returns The mapped set of decorations
 */
export function mapDecorations(
  set: DecorationSet,
  tr: Transaction,
  state: EditorState,
  force: boolean = false
): DecorationSet {
  let mapping = tr.mapping;
  const hasDecorations = set.find().length;

  if (hasDecorations && (isRemoteTransaction(tr, state) || force)) {
    try {
      mapping = recreateTransform(tr.before, tr.doc, {
        complexSteps: true,
        wordDiffs: false,
        simplifyDiff: true,
      }).mapping;
    } catch (err) {
      // oxlint-disable-next-line no-console
      console.warn("Failed to recreate transform: ", err);
    }
  }

  return set.map(mapping, tr.doc);
}
