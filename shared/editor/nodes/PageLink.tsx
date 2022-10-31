import Token from "markdown-it/lib/token";
import { CollectionIcon } from "outline-icons";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import * as React from "react";
import ReactDOM from "react-dom";
import { sanitizeUrl } from "../../utils/urls";
import toggleWrap from "../commands/toggleWrap";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";

export default class PageLink extends Node {
  get name() {
    return "page_link";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        title: {
          default: null,
        },
        href: {
          default: null,
        },
      },
      group: "block",
      defining: true,
      atom: true,
      parseDOM: [
        {
          tag: "a.page-link",
          getAttrs: (dom: HTMLAnchorElement) => {
            return {
              title: dom.title,
              href: dom.getAttribute("href"),
            };
          },
        },
      ],
      toDOM: (node) => {
        let content, mainIcon;
        if (typeof document !== "undefined") {
          // Title div
          content = document.createElement("div");
          content.className = "content";

          // Main icon
          const mainIconComponent = (
            <CollectionIcon color="currentColor" size={48} />
          );
          mainIcon = document.createElement("div");
          mainIcon.className = "icon";
          ReactDOM.render(mainIconComponent, mainIcon);
        }

        return [
          "a",
          {
            class: `page-link`,
            href: sanitizeUrl(node.attrs.href),
          },
          ...(mainIcon ? [mainIcon] : []),
          [
            "div",
            {
              class: "content",
              contentEditable: "false",
            },
            node.attrs.title,
          ],
        ];
      },
    };
  }

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, any>) => toggleWrap(type, attrs);
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(`[${node.attrs.title}](${node.attrs.href})\n\n`);
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: "page_link",
      getAttrs: (tok: Token) => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title"),
      }),
    };
  }
}
