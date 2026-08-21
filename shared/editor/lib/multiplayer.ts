import type { Transaction } from "prosemirror-state";
import type { DecorationSet, EditorView } from "prosemirror-view";
import { recreateTransform } from "./prosemirror-recreate-transform";

/**
 * Hooks into the collaboration plugins, registered by the multiplayer
 * extension when it is loaded.
 */
export interface MultiplayerHooks {
  /** Returns true if the transaction originated from a remote client. */
  isRemoteTransaction: (tr: Transaction) => boolean;
  /** Stops the collaborative undo manager from capturing further changes. */
  stopCapturing: (view: EditorView) => void;
}

let hooks: MultiplayerHooks | undefined;

/**
 * Registers the multiplayer hooks. Called by the multiplayer extension so
 * that editors without collaboration do not load the collaboration libraries.
 *
 * @param value the hooks to register.
 */
export function registerMultiplayerHooks(value: MultiplayerHooks): void {
  hooks = value;
}

/**
 * Checks if a transaction is a remote transaction
 *
 * @param tr The Prosemirror transaction
 * @returns true if the transaction is a remote transaction
 */
export function isRemoteTransaction(tr: Transaction): boolean {
  return hooks?.isRemoteTransaction(tr) ?? false;
}

/**
 * Stops the collaborative undo manager from capturing further changes, if
 * the multiplayer extension is loaded.
 *
 * @param view The editor view.
 */
export function stopCapturingUndo(view: EditorView): void {
  hooks?.stopCapturing(view);
}

/**
 * Map the set of decorations in response to a change in the document.
 *
 * @param set The current set of decorations
 * @param tr The Prosemirror transaction
 * @param force Whether to force recalculation for map even for local transactions
 * @returns The mapped set of decorations
 */
export function mapDecorations(
  set: DecorationSet,
  tr: Transaction,
  force: boolean = false
): DecorationSet {
  let mapping = tr.mapping;
  const hasDecorations = set.find().length;

  if (hasDecorations && (isRemoteTransaction(tr) || force)) {
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
