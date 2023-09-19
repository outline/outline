import Token from "markdown-it/lib/token";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { sanitizeUrl } from "../../utils/urls";
import toggleWrap from "../commands/toggleWrap";
import VideoComponent from "../components/Video";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/links";
import { ComponentProps } from "../types";
import Node from "./Node";

export default class Video extends Node {
  get name() {
    return "video";
  }

  get rulePlugins() {
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        id: {
          default: null,
        },
        src: {
          default: null,
        },
        width: {
          default: null,
        },
        height: {
          default: null,
        },
        title: {},
      },
      group: "block",
      defining: true,
      atom: true,
      parseDOM: [
        {
          priority: 100,
          tag: "video",
          getAttrs: (dom: HTMLAnchorElement) => ({
            id: dom.id,
            title: dom.getAttribute("title"),
            src: dom.getAttribute("src"),
            size: parseInt(dom.dataset.size || "0", 10),
            width: dom.getAttribute("width"),
            height: dom.getAttribute("height"),
          }),
        },
      ],
      toDOM: (node) => [
        "video",
        {
          id: node.attrs.id,
          src: sanitizeUrl(node.attrs.src),
          download: node.attrs.title,
          controls: true,
          width: node.attrs.width,
          height: node.attrs.height,
          "data-size": node.attrs.size,
        },
        node.attrs.title,
      ],
      toPlainText: (node) => node.attrs.title,
    };
  }

  handleSelect =
    ({ getPos }: { getPos: () => number }) =>
    () => {
      const { view } = this.editor;
      const $pos = view.state.doc.resolve(getPos());
      const transaction = view.state.tr.setSelection(new NodeSelection($pos));
      view.dispatch(transaction);
    };

  component = (props: ComponentProps) => {
    const { isSelected, node } = props;

    return (
      <VideoComponent
        src={node.attrs.src}
        title={node.attrs.title}
        width={node.attrs.width}
        height={node.attrs.height}
        isSelected={isSelected}
      />
    );
  };

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, Primitive>) => toggleWrap(type, attrs);
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(
      `[${node.attrs.title} ${node.attrs.width}x${node.attrs.height}](${node.attrs.src})\n\n`
    );
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: "video",
      getAttrs: (tok: Token) => ({
        src: tok.attrGet("src"),
        title: tok.attrGet("title"),
        width: tok.attrGet("width"),
        height: tok.attrGet("height"),
      }),
    };
  }
}
