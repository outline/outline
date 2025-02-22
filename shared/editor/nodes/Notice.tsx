import { Token } from "markdown-it";
import { WarningIcon, InfoIcon, StarredIcon, DoneIcon } from "outline-icons";
import { wrappingInputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { Command, EditorState, Transaction } from "prosemirror-state";
import * as React from "react";
import ReactDOM from "react-dom";
import { Primitive } from "utility-types";
import toggleWrap from "../commands/toggleWrap";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import noticesRule from "../rules/notices";
import Node from "./Node";

export enum NoticeTypes {
  Info = "info",
  Success = "success",
  Tip = "tip",
  Warning = "warning",
}

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
          default: NOTICE_TYPES.INFO,
        },
      },
      content:
        "(list | blockquote | hr | paragraph | heading | code_block | code_fence | attachment)+",
      group: "block",
      defining: true,
      draggable: true,
      parseDOM: [
        {
          tag: "div.notice-block",
          preserveWhitespace: "full",
          contentElement: (node: HTMLDivElement) =>
            node.querySelector("div.content") || node,
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes(NOTICE_TYPES.TIP)
              ? NOTICE_TYPES.TIP
              : dom.className.includes(NOTICE_TYPES.WARNING)
              ? NOTICE_TYPES.WARNING
              : dom.className.includes(NOTICE_TYPES.SUCCESS)
              ? NOTICE_TYPES.SUCCESS
              : undefined,
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
            style: dom.className.includes(NOTICE_TYPES.WARNING)
              ? NOTICE_TYPES.WARNING
              : dom.className.includes(NOTICE_TYPES.SUCCESS)
              ? NOTICE_TYPES.SUCCESS
              : undefined,
          }),
        },
        // Confluence parsing
        {
          tag: "div.confluence-information-macro",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes("confluence-information-macro-tip")
              ? NOTICE_TYPES.SUCCESS
              : dom.className.includes("confluence-information-macro-note")
              ? NOTICE_TYPES.TIP
              : dom.className.includes("confluence-information-macro-warning")
              ? NOTICE_TYPES.WARNING
              : undefined,
          }),
        },
      ],
      toDOM: (node) => {
        let icon;
        if (typeof document !== "undefined") {
          let component;

          if (node.attrs.style === NOTICE_TYPES.TIP) {
            component = <StarredIcon />;
          } else if (node.attrs.style === NOTICE_TYPES.WARNING) {
            component = <WarningIcon />;
          } else if (node.attrs.style === NOTICE_TYPES.SUCCESS) {
            component = <DoneIcon />;
          } else {
            component = <InfoIcon />;
          }

          icon = document.createElement("div");
          icon.className = "icon";
          ReactDOM.render(component, icon);
        }

        return [
          "div",
          { class: `notice-block ${node.attrs.style}` },
          ...(icon ? [icon] : []),
          ["div", { class: "content" }, 0],
        ];
      },
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      createNotice: (attrs: Record<string, Primitive>) => toggleWrap(type, attrs),
      changeNoticeType: () => () => true,
      info: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NOTICE_TYPES.INFO),
      warning: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NOTICE_TYPES.WARNING),
      success: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NOTICE_TYPES.SUCCESS),
      tip: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NOTICE_TYPES.TIP),
    };
  }

  handleStyleChange = (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined,
    style: NOTICE_TYPES
  ): boolean => {
    const { tr, selection } = state;
    const { $from } = selection;
    const node = $from.node(-1);

    if (node?.type.name === this.name) {
      if (dispatch) {
        const transaction = tr.setNodeMarkup($from.before(-1), undefined, {
          ...node.attrs,
          style,
        });
        dispatch(transaction);
      }
      return true;
    }
    return false;
  };

  inputRules({ type }: { type: NodeType }) {
    return [wrappingInputRule(/^:::$/, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n:::" + (node.attrs.style || "info") + "\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write(":::");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "container_notice",
      getAttrs: (tok: Token) => ({ style: tok.info }),
    };
  }
}
