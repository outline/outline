import { wrappingInputRule } from "prosemirror-inputrules";
import toggleWrap from "../commands/toggleWrap";
import { WarningIcon, InfoIcon, StarredIcon } from "outline-icons";
import * as React from "react";
import ReactDOM from "react-dom";
import Node from "./Node";
import noticesRule from "../rules/notices";

export default class Notice extends Node {
  get styleOptions() {
    return Object.entries({
      info: this.options.dictionary.info,
      warning: this.options.dictionary.warning,
      tip: this.options.dictionary.tip,
    });
  }

  get name() {
    return "container_notice";
  }

  get rulePlugins() {
    return [noticesRule];
  }

  get schema() {
    return {
      attrs: {
        style: {
          default: "info",
        },
      },
      content: "block+",
      group: "block",
      defining: true,
      draggable: true,
      parseDOM: [
        {
          tag: "div.notice-block",
          preserveWhitespace: "full",
          contentElement: "div:last-child",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes("tip")
              ? "tip"
              : dom.className.includes("warning")
              ? "warning"
              : undefined,
          }),
        },
      ],
      toDOM: node => {
        const select = document.createElement("select");
        select.addEventListener("change", this.handleStyleChange);

        this.styleOptions.forEach(([key, label]) => {
          const option = document.createElement("option");
          option.value = key;
          option.innerText = label;
          option.selected = node.attrs.style === key;
          select.appendChild(option);
        });

        let component;

        if (node.attrs.style === "tip") {
          component = <StarredIcon color="currentColor" />;
        } else if (node.attrs.style === "warning") {
          component = <WarningIcon color="currentColor" />;
        } else {
          component = <InfoIcon color="currentColor" />;
        }

        const icon = document.createElement("div");
        icon.className = "icon";
        ReactDOM.render(component, icon);

        return [
          "div",
          { class: `notice-block ${node.attrs.style}` },
          icon,
          ["div", { contentEditable: false }, select],
          ["div", { class: "content" }, 0],
        ];
      },
    };
  }

  commands({ type }) {
    return attrs => toggleWrap(type, attrs);
  }

  handleStyleChange = event => {
    const { view } = this.editor;
    const { tr } = view.state;
    const element = event.target;
    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const transaction = tr.setNodeMarkup(result.inside, undefined, {
        style: element.value,
      });
      view.dispatch(transaction);
    }
  };

  inputRules({ type }) {
    return [wrappingInputRule(/^:::$/, type)];
  }

  toMarkdown(state, node) {
    state.write("\n:::" + (node.attrs.style || "info") + "\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write(":::");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "container_notice",
      getAttrs: tok => ({ style: tok.info }),
    };
  }
}
