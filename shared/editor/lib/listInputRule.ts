import { wrappingInputRule, InputRule } from "prosemirror-inputrules";
import type {
  NodeType,
  Node as ProsemirrorNode,
  Attrs,
} from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import toggleList from "../commands/toggleList";
import { findParentNodeClosestToPos } from "../queries/findParentNode";
import { isInHeading } from "../queries/isInHeading";
import { isList } from "../queries/isList";

/**
 * A wrapper for wrappingInputRule that prevents execution inside heading nodes.
 * This fixes the bug where typing list triggers ("* ", "- ", "1. ", etc.) inside
 * a heading would trigger list conversion.
 */
export function listWrappingInputRule(
  regexp: RegExp,
  nodeType: NodeType,
  getAttrs?: (match: RegExpMatchArray) => Attrs | null,
  joinPredicate?: (match: RegExpMatchArray, node: ProsemirrorNode) => boolean
): InputRule {
  const rule = wrappingInputRule(regexp, nodeType, getAttrs, joinPredicate);

  // Wrap the original rule to check if we're inside a heading
  return new InputRule(regexp, (state, match, start, end) => {
    // Don't apply the rule if we're inside a heading
    if (isInHeading(state)) {
      return null;
    }

    // Otherwise, execute the original wrappingInputRule handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rule as any).handler(state, match, start, end);
  });
}

/**
 * An input rule that converts an existing plain list (bullet or ordered) to a
 * checklist when the checkbox marker is typed at the start of a list item,
 * preserving any nested list structure.
 *
 * @param regexp the pattern matching the checkbox marker, e.g. "[ ] ".
 * @param listType the checkbox list node type to convert to.
 * @param itemType the checkbox item node type to convert items to.
 * @returns the input rule.
 */
export function checkboxListInputRule(
  regexp: RegExp,
  listType: NodeType,
  itemType: NodeType
): InputRule {
  return new InputRule(regexp, (state, _match, start, end) => {
    const { schema } = state;

    // Only act when the selection sits inside a plain (non-checkbox) list —
    // converting a paragraph is already handled by listWrappingInputRule.
    const list = findParentNodeClosestToPos(state.selection.$from, (node) =>
      isList(node, schema)
    );
    if (!list || list.node.type === listType) {
      return null;
    }

    // Remove the typed marker, then convert the list in place.
    const tr = state.tr.delete(start, end);
    const after = state.apply(tr);
    toggleList(listType, itemType)(after, (toggleTr) => {
      toggleTr.steps.forEach((step) => tr.step(step));
    });

    // Place the cursor at the start of the converted item, where the marker
    // was, so the user can continue typing.
    tr.setSelection(TextSelection.near(tr.doc.resolve(start)));
    return tr;
  });
}
