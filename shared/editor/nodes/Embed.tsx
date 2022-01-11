import Token from "markdown-it/lib/token";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import * as React from "react";
import { ComponentProps } from "../lib/ComponentView";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import embedsRule from "../rules/embeds";
import Node from "./Node";

const cache = {};

export default class Embed extends Node {
  get name() {
    return "embed";
  }

  get schema(): NodeSpec {
    return {
      content: "inline*",
      group: "block",
      atom: true,
      attrs: {
        href: {},
      },
      parseDOM: [
        {
          tag: "iframe[class=embed]",
          getAttrs: (dom: HTMLIFrameElement) => {
            const { embeds } = this.editor.props;
            const href = dom.getAttribute("src") || "";

            if (embeds) {
              for (const embed of embeds) {
                const matches = embed.matcher(href);
                if (matches) {
                  return {
                    href,
                  };
                }
              }
            }

            return {};
          },
        },
      ],
      toDOM: (node) => [
        "iframe",
        { class: "embed", src: node.attrs.href, contentEditable: "false" },
        0,
      ],
    };
  }

  get rulePlugins() {
    return [embedsRule(this.options.embeds)];
  }

  component({ isEditable, isSelected, theme, node }: ComponentProps) {
    const { embeds } = this.editor.props;

    // matches are cached in module state to avoid re running loops and regex
    // here. Unfortuantely this function is not compatible with React.memo or
    // we would use that instead.
    const hit = cache[node.attrs.href];
    let Component = hit ? hit.Component : undefined;
    let matches = hit ? hit.matches : undefined;

    if (!Component) {
      for (const embed of embeds) {
        const m = embed.matcher(node.attrs.href);
        if (m) {
          Component = embed.component;
          matches = m;
          cache[node.attrs.href] = { Component, matches };
        }
      }
    }

    if (!Component) {
      return null;
    }

    return (
      <Component
        attrs={{ ...node.attrs, matches }}
        isEditable={isEditable}
        isSelected={isSelected}
        theme={theme}
      />
    );
  }

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, any>) => (
      state: EditorState,
      dispatch: (tr: Transaction) => void
    ) => {
      dispatch(
        state.tr.replaceSelectionWith(type.create(attrs)).scrollIntoView()
      );
      return true;
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(
      "[" +
        state.esc(node.attrs.href, false) +
        "](" +
        state.esc(node.attrs.href, false) +
        ")"
    );
    state.write("\n\n");
  }

  parseMarkdown() {
    return {
      node: "embed",
      getAttrs: (token: Token) => ({
        href: token.attrGet("href"),
      }),
    };
  }
}
