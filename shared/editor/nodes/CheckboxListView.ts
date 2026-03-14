import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorView, NodeView } from "prosemirror-view";
import type { Dictionary } from "../../../app/hooks/useDictionary";
import { isBrowser } from "../../utils/browser";
import Storage from "../../utils/Storage";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/**
 * Custom NodeView that wraps checkbox lists with a toggle control for
 * showing/hiding completed items.
 */
export class CheckboxListView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  private toggleControl: HTMLButtonElement;
  private node: ProsemirrorNode;
  private userIdentifier: string;
  private dictionary: Dictionary;
  private isNested: boolean;

  constructor(
    node: ProsemirrorNode,
    _view: EditorView,
    _getPos: () => number | undefined,
    userIdentifier: string,
    dictionary: Dictionary
  ) {
    this.node = node;
    this.userIdentifier = userIdentifier;
    this.dictionary = dictionary;

    // Detect if this is a nested checkbox list (inside a checkbox_item)
    const pos = _getPos();
    this.isNested =
      pos !== undefined &&
      _view.state.doc.resolve(pos).parent.type.name === "checkbox_item";

    // Build DOM structure
    const wrapperElement = document.createElement("div");
    wrapperElement.classList.add(EditorStyleHelper.checklistWrapper);

    this.toggleControl = document.createElement("button");
    this.toggleControl.classList.add(
      EditorStyleHelper.checklistCompletedToggle
    );
    this.toggleControl.contentEditable = "false";

    this.contentDOM = document.createElement("ul");
    this.contentDOM.classList.add("checkbox_list");

    if (this.isNested) {
      this.toggleControl.style.display = "none";
      wrapperElement.appendChild(this.contentDOM);
    } else {
      if (isBrowser) {
        this.toggleControl.addEventListener("click", this.handleToggleClick);
      }
      wrapperElement.appendChild(this.toggleControl);
      wrapperElement.appendChild(this.contentDOM);
    }

    this.dom = wrapperElement;

    if (isBrowser && !this.isNested) {
      this.updateToggleState();
    }
  }

  private handleToggleClick = (clickEvent: Event) => {
    if (!isBrowser) {
      return;
    }

    clickEvent.preventDefault();
    clickEvent.stopPropagation();

    const listId = this.node.attrs.id;
    if (!listId) {
      return;
    }

    const storageKey = `checklist-${listId}-${this.userIdentifier}-hidden`;
    const currentlyCollapsed = !!Storage.get(storageKey);
    Storage.set(storageKey, !currentlyCollapsed);
    this.updateToggleState();
  };

  private updateToggleState() {
    if (!isBrowser || this.isNested) {
      return;
    }

    const listId = this.node.attrs.id;
    if (!listId) {
      this.toggleControl.style.display = "none";
      return;
    }

    const storageKey = `checklist-${listId}-${this.userIdentifier}-hidden`;
    const shouldCollapse = !!Storage.get(storageKey);

    // Count completed items, including nested checkbox lists
    let completedItemsCount = 0;
    this.node.descendants((childNode) => {
      if (
        childNode.type.name === "checkbox_item" &&
        childNode.attrs.checked === true
      ) {
        completedItemsCount++;
      }
    });

    // Show/hide button based on completed count
    if (completedItemsCount === 0) {
      this.toggleControl.style.display = "none";
      this.dom.classList.remove(EditorStyleHelper.checklistCompletedHidden);
    } else {
      this.toggleControl.style.display = "inline-block";
      this.toggleControl.textContent = shouldCollapse
        ? this.dictionary.showCompleted(completedItemsCount)
        : this.dictionary.hideCompleted;

      if (shouldCollapse) {
        this.dom.classList.add(EditorStyleHelper.checklistCompletedHidden);
      } else {
        this.dom.classList.remove(EditorStyleHelper.checklistCompletedHidden);
      }
    }
  }

  update(node: ProsemirrorNode) {
    if (!isBrowser) {
      return false;
    }
    if (node.type.name !== "checkbox_list") {
      return false;
    }

    this.node = node;
    this.updateToggleState();
    return true;
  }

  destroy() {
    if (!isBrowser || this.isNested) {
      return;
    }
    this.toggleControl.removeEventListener("click", this.handleToggleClick);
  }
}
