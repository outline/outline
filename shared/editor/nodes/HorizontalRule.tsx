import { t } from "i18next";
import type Token from "markdown-it/lib/token.mjs";
import { InputRule } from "prosemirror-inputrules";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { PageBreakIcon, HorizontalRuleIcon } from "outline-icons";
import type { Primitive } from "utility-types";
import { isNodeActive } from "../queries/isNodeActive";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import type { SelectionToolbarMenuDescriptor } from "../types";
import Node from "./Node";

export default class HorizontalRule extends Node {
  get name() {
    return "hr";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        markup: {
          default: "---",
        },
      },
      group: "block",
      parseDOM: [{ tag: "hr" }],
      toDOM: (node) => [
        "hr",
        { class: node.attrs.markup === "***" ? "page-break" : "" },
      ],
    };
  }

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        dispatch?.(
          state.tr.replaceSelectionWith(type.create(attrs)).scrollIntoView()
        );
        return true;
      };
  }

  selectionToolbarMenus(): SelectionToolbarMenuDescriptor[] {
    return [
      {
        priority: 50,
        matches: (ctx) => ctx.selectedNodeType === "hr" && !ctx.readOnly,
        getItems: (ctx) => {
          const { schema } = ctx;
          return [
            {
              name: "hr",
              tooltip: t("Divider"),
              attrs: { markup: "---" },
              active: isNodeActive(schema.nodes.hr, { markup: "---" }),
              icon: <HorizontalRuleIcon />,
            },
            {
              name: "hr",
              tooltip: t("Page break"),
              attrs: { markup: "***" },
              active: isNodeActive(schema.nodes.hr, { markup: "***" }),
              icon: <PageBreakIcon />,
            },
          ];
        },
      },
    ];
  }

  keys({ type }: { type: NodeType }): Record<string, Command> {
    return {
      "Mod-_": (state, dispatch) => {
        dispatch?.(
          state.tr.replaceSelectionWith(type.create()).scrollIntoView()
        );
        return true;
      },
    };
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      new InputRule(/^(?:---|___|\*\*\*)$/, (state, match, start, end) => {
        const { tr } = state;

        if (match[0]) {
          const markup = match[0].trim();
          tr.replaceWith(start - 1, end, type.create({ markup }));
        }

        return tr;
      }),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(`\n${node.attrs.markup}`);
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      node: "hr",
      getAttrs: (tok: Token) => ({
        markup: tok.markup,
      }),
    };
  }
}
