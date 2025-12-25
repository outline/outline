import { wrappingInputRule, InputRule } from "prosemirror-inputrules";
import type {
  NodeType,
  Node as ProsemirrorNode,
  Attrs,
} from "prosemirror-model";
import { isInHeading } from "../queries/isInHeading";

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
