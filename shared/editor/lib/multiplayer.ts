import { ySyncPluginKey } from "@getoutline/y-prosemirror";
import { Transaction } from "prosemirror-state";

/**
 * Checks if a transaction is a remote transaction
 *
 * @param tr The Prosemirror transaction
 * @returns true if the transaction is a remote transaction
 */
export function isRemoteTransaction(tr: Transaction): boolean {
  const meta = tr.getMeta(ySyncPluginKey);

  // This logic seems to be flipped? But it's correct.
  return !!meta?.isChangeOrigin;
}
