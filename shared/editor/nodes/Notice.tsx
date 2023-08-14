import Token from "markdown-it/lib/token";
import { WarningIcon, InfoIcon, StarredIcon, DoneIcon } from "outline-icons";
import { wrappingInputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import * as React from "react";
import ReactDOM from "react-dom";
import { Primitive } from "utility-types";
import toggleWrap from "../commands/toggleWrap";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import noticesRule from "../rules/notices";
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
          default: "info",
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
            style: dom.className.includes("tip")
              ? "tip"
              : dom.className.includes("warning")
              ? "warning"
              : dom.className.includes("success")
              ? "success"
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
            style: dom.className.includes("warning")
              ? "warning"
              : dom.className.includes("success")
              ? "success"
              : undefined,
          }),
        },
        // Confluence parsing
        {
          tag: "div.confluence-information-macro",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes("confluence-information-macro-tip")
              ? "success"
              : dom.className.includes("confluence-information-macro-note")
              ? "tip"
              : dom.className.includes("confluence-information-macro-warning")
              ? "warning"
              : undefined,
          }),
        },
      ],
      toDOM: (node) => {
        let icon;
        if (typeof document !== "undefined") {
          let component;

          if (node.attrs.style === "tip") {
            component = <StarredIcon />;
          } else if (node.attrs.style === "warning") {
            component = <WarningIcon />;
          } else if (node.attrs.style === "success") {
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
    return (attrs: Record<string, Primitive>) => toggleWrap(type, attrs);
  }

  handleStyleChange = (event: InputEvent) => {
    const { view } = this.editor;
    const { tr } = view.state;
    const element = event.target;
    if (!(element instanceof HTMLSelectElement)) {
      return;
    }

    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const transaction = tr.setNodeMarkup(result.inside, undefined, {
        style: element.value,
      });
      view.dispatch(transaction);
    }
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
