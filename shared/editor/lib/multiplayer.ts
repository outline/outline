import type { EditorState, Transaction } from "prosemirror-state";
import { PluginKey } from "prosemirror-state";
import type { DecorationSet } from "prosemirror-view";
import { recreateTransform } from "./prosemirror-recreate-transform";

/**
 * Collaboration operations exposed by the facade plugin mounted by the
 * multiplayer extension. They allow shared code to use the collaboration
 * libraries without a static dependency on them.
 */
export interface MultiplayerOperations {
  /** Returns true if the transaction originated from a remote client. */
  isRemoteTransaction: (tr: Transaction) => boolean;
  /** Stops the collaborative undo manager from capturing further changes. */
  stopCapturing: (state: EditorState) => void;
}

/**
 * Spec of the facade plugin mounted by the multiplayer extension.
 */
interface MultiplayerPluginSpec {
  multiplayer?: MultiplayerOperations;
  [key: string]: unknown;
}

/**
 * Key of the facade plugin mounted by the multiplayer extension.
 */
export const multiplayerPluginKey = new PluginKey("multiplayer-facade");

/**
 * Get the collaboration operations, if the multiplayer extension is mounted in
 * the editor.
 *
 * @param state The editor state
 * @returns the operations, or undefined when not collaborating
 */
function getOperations(state: EditorState): MultiplayerOperations | undefined {
  const spec: MultiplayerPluginSpec | undefined =
    multiplayerPluginKey.get(state)?.spec;
  return spec?.multiplayer;
}

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
  return getOperations(state)?.isRemoteTransaction(tr) ?? false;
}

/**
 * Stops the collaborative undo manager from capturing further changes, if
 * the multiplayer extension is mounted in the editor.
 *
 * @param state The editor state
 */
export function stopCapturingUndo(state: EditorState): void {
  getOperations(state)?.stopCapturing(state);
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
