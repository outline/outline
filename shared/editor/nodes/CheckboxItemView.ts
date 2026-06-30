import type { Node as ProsemirrorNode } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import type { EditorView, NodeView } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";
import { isBrowser } from "../../utils/browser";

const checkboxSVG = `<svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><rect class="checkbox-box" x="1" y="1" width="12" height="12" rx="3" /><path class="checkbox-tick" d="M3.5 7.3L6 9.8L10.5 4.2" /></svg>`;

/**
 * Custom NodeView for checkbox items. Keeps the DOM stable across checked
 * state changes so the tick can transition its stroke when toggled, and
 * handles clicks on both the checkbox and the margin beside it.
 */
export class CheckboxItemView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  private view: EditorView;
  private getPos: () => number | undefined;
  private checkbox: HTMLElement;
  private wrapper: HTMLElement;

  constructor(
    node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined
  ) {
    this.view = view;
    this.getPos = getPos;

    const id = `checkbox-${uuidv4()}`;

    this.dom = document.createElement("li");
    this.dom.setAttribute("data-type", "checkbox_item");

    this.checkbox = document.createElement("span");
    this.checkbox.tabIndex = -1;
    this.checkbox.className = "checkbox";
    this.checkbox.setAttribute("aria-labelledby", id);
    this.checkbox.setAttribute("role", "checkbox");
    this.checkbox.innerHTML = checkboxSVG;

    this.wrapper = document.createElement("span");
    this.wrapper.contentEditable = "false";
    this.wrapper.appendChild(this.checkbox);
    if (isBrowser) {
      this.wrapper.addEventListener("click", this.handleClick);
    }

    this.contentDOM = document.createElement("div");
    this.contentDOM.id = id;

    this.dom.appendChild(this.wrapper);
    this.dom.appendChild(this.contentDOM);

    this.updateChecked(node);
  }

  update(node: ProsemirrorNode) {
    if (node.type.name !== "checkbox_item") {
      return false;
    }
    this.updateChecked(node);
    return true;
  }

  ignoreMutation(mutation: MutationRecord) {
    // Only mutations within the editable content should be read by the editor;
    // the checkbox chrome is managed here.
    return !this.contentDOM.contains(mutation.target);
  }

  destroy() {
    if (isBrowser) {
      this.wrapper.removeEventListener("click", this.handleClick);
    }
  }

  private updateChecked(node: ProsemirrorNode) {
    const checked = !!node.attrs.checked;
    this.checkbox.setAttribute("aria-checked", checked.toString());
    this.dom.classList.toggle("checked", checked);
  }

  private handleClick = (event: Event) => {
    // The target may be the checkbox itself, the SVG inside it, or the
    // surrounding margin, so resolve up to the nearest checkbox element.
    if (!(event.target instanceof Element)) {
      return;
    }
    const checkbox = event.target.closest(".checkbox");

    const pos = this.getPos();
    if (pos === undefined) {
      return;
    }

    const { view } = this;
    const { tr, doc } = view.state;

    if (checkbox) {
      // Clicking the checkbox toggles its checked state.
      view.dispatch(
        tr.setNodeMarkup(pos, undefined, {
          checked: checkbox.getAttribute("aria-checked") !== "true",
        })
      );
    } else if (view.editable) {
      // Clicking the margin beside the checkbox focuses the start of the item.
      view.dispatch(tr.setSelection(TextSelection.near(doc.resolve(pos + 1))));
      view.focus();
    }
  };
}
