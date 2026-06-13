import type Token from "markdown-it/lib/token.mjs";
import type {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
} from "prosemirror-model";
import {
  splitListItem,
  sinkListItem,
  liftListItem,
} from "prosemirror-schema-list";
import { TextSelection } from "prosemirror-state";
import { v4 as uuidv4 } from "uuid";
import { toggleCheckboxItems } from "../commands/toggleCheckboxItems";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
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
      content: "block+",
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
        const id = `checkbox-${uuidv4()}`;
        const checked = node.attrs.checked.toString();
        let wrapper;
        if (typeof document !== "undefined") {
          const input = document.createElement("span");
          input.tabIndex = -1;
          input.className = "checkbox";
          input.setAttribute("aria-checked", checked);
          input.setAttribute("aria-labelledby", id);
          input.setAttribute("role", "checkbox");

          wrapper = document.createElement("span");
          wrapper.contentEditable = "false";
          wrapper.appendChild(input);
          wrapper.addEventListener("click", this.handleClick);
        }

        return [
          "li",
          {
            "data-type": this.name,
            class: node.attrs.checked ? "checked" : undefined,
          },
          wrapper ?? [
            "span",
            {
              contentEditable: "false",
            },
            ["span", { class: "checkbox", "aria-checked": checked }],
          ],
          ["div", { id }, 0],
        ];
      },
    };
  }

  get rulePlugins() {
    return [checkboxRule];
  }

  handleClick = (event: Event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const isCheckbox = event.target.classList.contains("checkbox");
    const checkbox = isCheckbox
      ? event.target
      : event.target.querySelector(".checkbox");
    if (!checkbox) {
      return;
    }

    const { view } = this.editor;
    const { tr } = view.state;
    const { top, left } = checkbox.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });
    if (!result) {
      return;
    }

    if (isCheckbox) {
      // Clicking the checkbox itself toggles its checked state.
      view.dispatch(
        tr.setNodeMarkup(result.inside, undefined, {
          checked: checkbox.getAttribute("aria-checked") !== "true",
        })
      );
    } else {
      // Clicking the margin beside the checkbox focuses the start of the item.
      const selection = TextSelection.near(
        view.state.doc.resolve(result.inside + 1)
      );
      view.dispatch(tr.setSelection(selection));
      view.focus();
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
      "Mod-Enter": toggleCheckboxItems(type),
      "Shift-Tab": liftListItem(type),
      "Mod-]": sinkListItem(type),
      "Mod-[": liftListItem(type),
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.append(node.attrs.checked ? "[x] " : "[ ] ");
    if (state.inTable) {
      node.forEach((block, _, i) => {
        if (i > 0) {
          state.append(" ");
        }
        state.renderInline(block);
      });
      return;
    }
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
