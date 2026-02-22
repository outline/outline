import type { Transaction } from "prosemirror-state";
import type { DecorationSet } from "prosemirror-view";
import { recreateTransform } from "./prosemirror-recreate-transform";

/**
 * Checks if a transaction is a remote transaction
 *
 * @param tr The Prosemirror transaction
 * @returns true if the transaction is a remote transaction
 */
export function isRemoteTransaction(tr: Transaction): boolean {
  // Use the string key directly to avoid importing y-prosemirror in the
  // initial bundle. ySyncPluginKey is `new PluginKey("y-sync")` and getMeta
  // accepts a string key.
  const meta = tr.getMeta("y-sync");

  // This logic seems to be flipped? But it's correct.
  return !!meta?.isChangeOrigin;
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
