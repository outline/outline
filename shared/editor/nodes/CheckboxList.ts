import { wrappingInputRule, InputRule } from "prosemirror-inputrules";
import {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
  Attrs,
} from "prosemirror-model";
import toggleList from "../commands/toggleList";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { isInHeading } from "../queries/isInHeading";
import Node from "./Node";

/**
 * A wrapper for wrappingInputRule that prevents execution inside heading nodes.
 * This fixes the bug where typing "[ ]" inside a heading would trigger checkbox list conversion.
 */
function safeWrappingInputRule(
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

export default class CheckboxList extends Node {
  get name() {
    return "checkbox_list";
  }

  get schema(): NodeSpec {
    return {
      group: "block list",
      content: "checkbox_item+",
      toDOM: () => ["ul", { class: this.name }, 0],
      parseDOM: [
        {
          tag: `[class="${this.name}"]`,
        },
      ],
    };
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-7": toggleList(type, schema.nodes.checkbox_item),
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return () => toggleList(type, schema.nodes.checkbox_item);
  }

  inputRules({ type }: { type: NodeType }) {
    return [safeWrappingInputRule(/^-?\s*(\[ \])\s$/i, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderList(node, "  ", () => "- ");
  }

  parseMarkdown() {
    return { block: "checkbox_list" };
  }
}
