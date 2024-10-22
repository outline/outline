import { Token } from "markdown-it";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import {
  splitListItem,
  sinkListItem,
  liftListItem,
} from "prosemirror-schema-list";
import toggleCheckboxItem from "../commands/toggleCheckboxItem";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import checkboxRule from "../rules/checkboxes";
import Node from "./Node";

export default class CheckboxItem extends Node {
  get name() {
    return "checkbox_item";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        checked: {
          default: false,
        },
      },
      content: "paragraph block*",
      defining: true,
      draggable: true,
      parseDOM: [
        {
          tag: `li[data-type="${this.name}"]`,
          getAttrs: (dom: HTMLLIElement) => ({
            checked: dom.className.includes("checked"),
          }),
        },
      ],
      toDOM: (node) => {
        const checked = node.attrs.checked.toString();
        let input;
        if (typeof document !== "undefined") {
          input = document.createElement("span");
          input.tabIndex = -1;
          input.className = "checkbox";
          input.setAttribute("aria-checked", checked);
          input.setAttribute("role", "checkbox");
          input.addEventListener("click", this.handleClick);
        }

        return [
          "li",
          {
            "data-type": this.name,
            class: node.attrs.checked ? "checked" : undefined,
          },
          [
            "span",
            {
              contentEditable: "false",
            },
            ...(input
              ? [input]
              : [["span", { class: "checkbox", "aria-checked": checked }]]),
          ],
          ["div", 0],
        ];
      },
    };
  }

  get rulePlugins() {
    return [checkboxRule];
  }

  handleClick = (event: Event) => {
    if (!(event.target instanceof HTMLSpanElement)) {
      return;
    }

    const { view } = this.editor;
    const { tr } = view.state;
    const { top, left } = event.target.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const transaction = tr.setNodeMarkup(result.inside, undefined, {
        checked: event.target.getAttribute("aria-checked") !== "true",
      });
      view.dispatch(transaction);
    }
  };

  commands({ type }: { type: NodeType }) {
    return {
      indentCheckboxList: () => sinkListItem(type),
      outdentCheckboxList: () => liftListItem(type),
    };
  }

  keys({ type }: { type: NodeType }) {
    return {
      Enter: splitListItem(type, {
        checked: false,
      }),
      Tab: sinkListItem(type),
      "Mod-Enter": toggleCheckboxItem(),
      "Shift-Tab": liftListItem(type),
      "Mod-]": sinkListItem(type),
      "Mod-[": liftListItem(type),
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(node.attrs.checked ? "[x] " : "[ ] ");
    state.renderContent(node);
  }

  parseMarkdown() {
    return {
      block: "checkbox_item",
      getAttrs: (tok: Token) => ({
        checked: tok.attrGet("checked") ? true : undefined,
      }),
    };
  }
}
