import type Token from "markdown-it/lib/token.mjs";
import { wrappingInputRule } from "prosemirror-inputrules";
import type {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
} from "prosemirror-model";
import { transparentize } from "polished";
import type { Primitive } from "utility-types";
import { Notice as NoticeComponent } from "../components/Notice";
import toggleWrap from "../commands/toggleWrap";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import {
  NoticeTypes,
  parseNoticeColor,
  parseNoticeIcon,
  parseNoticeInfo,
  serializeNoticeInfo,
} from "../lib/notice";
import noticesRule from "../rules/notices";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { ComponentProps } from "../types";
import Node from "./Node";

export default class Notice extends Node {
  get name() {
    return "container_notice";
  }

  get rulePlugins() {
    return [noticesRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        style: {
          default: NoticeTypes.Info,
        },
        icon: {
          default: null,
          validate: "string|null",
        },
        color: {
          default: null,
          validate: "string|null",
        },
      },
      content:
        "(list | blockquote | hr | paragraph | heading | code_block | code_fence | attachment)+",
      group: "block",
      defining: true,
      draggable: false,
      parseDOM: [
        {
          tag: `div.${EditorStyleHelper.notice}`,
          preserveWhitespace: "full",
          contentElement: (node: HTMLDivElement) =>
            node.querySelector(`div.${EditorStyleHelper.noticeContent}`) ||
            node,
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes(NoticeTypes.Tip)
              ? NoticeTypes.Tip
              : dom.className.includes(NoticeTypes.Warning)
                ? NoticeTypes.Warning
                : dom.className.includes(NoticeTypes.Success)
                  ? NoticeTypes.Success
                  : undefined,
            icon: parseNoticeIcon(dom.dataset.icon),
            color: parseNoticeColor(dom.dataset.color),
          }),
        },
        // Quill editor parsing
        {
          tag: "div.ql-hint",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.dataset.hint,
          }),
        },
        // GitBook parsing
        {
          tag: "div.alert.theme-admonition",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes(NoticeTypes.Warning)
              ? NoticeTypes.Warning
              : dom.className.includes(NoticeTypes.Success)
                ? NoticeTypes.Success
                : undefined,
          }),
        },
        // Confluence parsing
        {
          tag: "div.confluence-information-macro",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes("confluence-information-macro-tip")
              ? NoticeTypes.Success
              : dom.className.includes("confluence-information-macro-note")
                ? NoticeTypes.Tip
                : dom.className.includes("confluence-information-macro-warning")
                  ? NoticeTypes.Warning
                  : undefined,
          }),
        },
      ],
      toDOM: (node) => {
        const { icon } = node.attrs;
        const color = parseNoticeColor(node.attrs.color);

        return [
          "div",
          {
            class: `${EditorStyleHelper.notice} ${node.attrs.style}`,
            ...(icon ? { "data-icon": icon } : {}),
            // The color is validated as hex notation, so it is safe to write
            // into an inline style here.
            ...(color
              ? {
                  "data-color": color,
                  style: `background: ${transparentize(0.9, color)}; border-left-color: ${color}`,
                }
              : {}),
          },
          ["div", { class: EditorStyleHelper.noticeContent }, 0],
        ];
      },
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      container_notice: (attrs: Record<string, Primitive>) =>
        toggleWrap(type, attrs),
    };
  }

  component = (props: ComponentProps) => (
    <NoticeComponent {...props} onChangeIcon={this.handleChangeIcon(props)} />
  );

  handleChangeIcon =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (icon: string | null, color: string | null) => {
      const { view } = this.editor;
      const { tr } = view.state;

      if (node.attrs.icon === icon && node.attrs.color === color) {
        return;
      }

      view.dispatch(
        tr.setNodeMarkup(getPos(), undefined, {
          ...node.attrs,
          icon,
          color,
        })
      );
    };

  inputRules({ type }: { type: NodeType }) {
    return [wrappingInputRule(/^:::$/, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n:::" + serializeNoticeInfo(node.attrs) + "\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write(":::");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "container_notice",
      getAttrs: (tok: Token) => parseNoticeInfo(tok.info),
    };
  }
}
