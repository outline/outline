import Token from "markdown-it/lib/token";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/attachments";
import Node from "./Node";

export default class Attachment extends Node {
  get name() {
    return "container_attachment";
  }

  // get markdownToken(): string {
  //   return "container_attachment";
  // }

  get rulePlugins() {
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        src: {},
        name: {},
        size: {},
        type: {},
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
        return ["div", { class: `attachment-block` }, 0];
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n@@@" + node.attrs.type + "\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write("@@@");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "container_attachment",
      getAttrs: (tok: Token) => ({ style: tok.info }),
    };
  }
}
