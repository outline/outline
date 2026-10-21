import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import {
  AddMarkStep,
  AttrStep,
  DocAttrStep,
  RemoveMarkStep,
  ReplaceStep,
  type Step,
} from "prosemirror-transform";

/**
 * Check whether a transaction only edits inline content, such as typing,
 * deleting text within a single textblock, or changing marks. Such
 * transactions never add, remove, or resize block nodes, other than the
 * textblock that was edited.
 *
 * @param tr The transaction to inspect.
 * @param isStructuralAttr Optional predicate for attribute changes that
 *   should be treated as structural, given the node whose attribute changed.
 * @returns true if every step in the transaction is an inline edit.
 */
export function isInlineTransaction(
  tr: Transaction,
  isStructuralAttr?: (node: ProsemirrorNode) => boolean
): boolean {
  return tr.steps.every((step, index) =>
    isInlineStep(step, tr.docs[index], isStructuralAttr)
  );
}

function isInlineStep(
  step: Step,
  doc: ProsemirrorNode,
  isStructuralAttr?: (node: ProsemirrorNode) => boolean
): boolean {
  if (
    step instanceof AddMarkStep ||
    step instanceof RemoveMarkStep ||
    step instanceof DocAttrStep
  ) {
    return true;
  }

  if (step instanceof AttrStep) {
    const node = doc.nodeAt(step.pos);
    return !node || !isStructuralAttr?.(node);
  }

  if (!(step instanceof ReplaceStep)) {
    return false;
  }

  const { slice } = step;
  if (slice.openStart > 0 || slice.openEnd > 0) {
    return false;
  }

  let inline = true;
  slice.content.forEach((child) => {
    if (!child.isInline) {
      inline = false;
    }
  });
  if (!inline) {
    return false;
  }

  const $from = doc.resolve(step.from);
  return $from.parent.isTextblock && $from.sameParent(doc.resolve(step.to));
}
