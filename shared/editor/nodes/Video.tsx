import { Token } from "markdown-it";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { NodeSelection, TextSelection } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { sanitizeUrl } from "../../utils/urls";
import toggleWrap from "../commands/toggleWrap";
import Caption from "../components/Caption";
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
        title: {
          default: null,
          validate: "string|null",
        },
      },
      group: "block",
      selectable: true,
      // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1289000
      draggable: false,
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
            width: parseInt(dom.getAttribute("width") ?? "", 10),
            height: parseInt(dom.getAttribute("height") ?? "", 10),
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: "video",
        },
        [
          "video",
          {
            id: node.attrs.id,
            src: sanitizeUrl(node.attrs.src),
            controls: true,
            width: node.attrs.width,
            height: node.attrs.height,
          },
          String(node.attrs.title),
        ],
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

  handleChangeSize =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    ({ width, height }: { width: number; height?: number }) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr
        .setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width,
          height,
        })
        .setMeta("addToHistory", true);
      const $pos = transaction.doc.resolve(getPos());
      view.dispatch(transaction.setSelection(new NodeSelection($pos)));
    };

  handleCaptionKeyDown =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (event: React.KeyboardEvent<HTMLParagraphElement>) => {
      // Pressing Enter in the caption field should move the cursor/selection
      // below the video
      if (event.key === "Enter") {
        event.preventDefault();

        const { view } = this.editor;
        const $pos = view.state.doc.resolve(getPos() + node.nodeSize);
        view.dispatch(
          view.state.tr.setSelection(TextSelection.near($pos)).scrollIntoView()
        );
        view.focus();
        return;
      }

      // Pressing Backspace in an an empty caption field focuses the video.
      if (event.key === "Backspace" && event.currentTarget.innerText === "") {
        event.preventDefault();
        event.stopPropagation();
        const { view } = this.editor;
        const $pos = view.state.doc.resolve(getPos());
        const tr = view.state.tr.setSelection(new NodeSelection($pos));
        view.dispatch(tr);
        view.focus();
        return;
      }
    };

  handleCaptionBlur =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (event: React.FocusEvent<HTMLParagraphElement>) => {
      const caption = event.currentTarget.innerText;
      if (caption === node.attrs.title) {
        return;
      }

      const { view } = this.editor;
      const { tr } = view.state;

      // update meta on object
      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        title: caption,
      });
      view.dispatch(transaction);
    };

  component = (props: ComponentProps) => (
    <VideoComponent {...props} onChangeSize={this.handleChangeSize(props)}>
      <Caption
        width={props.node.attrs.width}
        onBlur={this.handleCaptionBlur(props)}
        onKeyDown={this.handleCaptionKeyDown(props)}
        isSelected={props.isSelected}
        placeholder={this.options.dictionary.imageCaptionPlaceholder}
      >
        {props.node.attrs.title}
      </Caption>
    </VideoComponent>
  );

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
        width: parseInt(tok.attrGet("width") ?? "", 10),
        height: parseInt(tok.attrGet("height") ?? "", 10),
      }),
    };
  }
}
