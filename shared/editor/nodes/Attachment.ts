import Token from "markdown-it/lib/token";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { bytesToHumanReadable } from "../../utils/files";
import toggleWrap from "../commands/toggleWrap";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/attachments";
import Node from "./Node";

export default class Attachment extends Node {
  get name() {
    return "attachment";
  }

  get rulePlugins() {
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        href: {},
        title: {},
        size: {},
      },
      group: "block",
      defining: true,
      atom: true,
      parseDOM: [
        {
          tag: "div.attachment-block",
          getAttrs: (dom: HTMLDivElement) => ({
            //
          }),
        },
      ],
      toDOM: (node) => {
        return [
          "a",
          {
            class: `attachment-block`,
            href: node.attrs.href,
            download: "true",
          },
          `${node.attrs.title} (${bytesToHumanReadable(node.attrs.size)})`,
        ];
      },
    };
  }

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, any>) => toggleWrap(type, attrs);
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(
      `[${node.attrs.title} ${node.attrs.size}](${node.attrs.href})\n\n`
    );
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: "attachment",
      getAttrs: (tok: Token) => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title"),
        size: tok.attrGet("size"),
      }),
    };
  }
}
