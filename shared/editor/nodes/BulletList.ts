import { wrappingInputRule, InputRule } from "prosemirror-inputrules";
import {
  Schema,
  NodeType,
  NodeSpec,
  Node as ProsemirrorModel,
  Attrs,
} from "prosemirror-model";
import toggleList from "../commands/toggleList";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { isInHeading } from "../queries/isInHeading";
import Node from "./Node";

/**
 * A wrapper for wrappingInputRule that prevents execution inside heading nodes.
 * This fixes the bug where typing "* " or "- " inside a heading would trigger bullet list conversion.
 */
function safeWrappingInputRule(
  regexp: RegExp,
  nodeType: NodeType,
  getAttrs?: (match: RegExpMatchArray) => Attrs | null,
  joinPredicate?: (match: RegExpMatchArray, node: ProsemirrorModel) => boolean
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

export default class BulletList extends Node {
  get name() {
    return "bullet_list";
  }

  get schema(): NodeSpec {
    return {
      content: "list_item+",
      group: "block list",
      parseDOM: [{ tag: "ul" }],
      toDOM: () => ["ul", 0],
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return () => toggleList(type, schema.nodes.list_item);
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-8": toggleList(type, schema.nodes.list_item),
    };
  }

  inputRules({ type }: { type: NodeType }) {
    return [safeWrappingInputRule(/^\s*([-+*])\s$/, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorModel) {
    state.renderList(node, "  ", () => (node.attrs.bullet || "*") + " ");
  }

  parseMarkdown() {
    return { block: "bullet_list" };
  }
}
