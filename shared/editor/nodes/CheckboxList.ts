import type {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { EditorView, NodeView as ProsemirrorNodeView } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
import { v4 as generateUuid } from "uuid";
import Storage from "../../utils/Storage";
import toggleList from "../commands/toggleList";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { listWrappingInputRule } from "../lib/listInputRule";
import { findBlockNodes } from "../queries/findChildren";
import Node from "./Node";

export default class CheckboxList extends Node {
  get name() {
    return "checkbox_list";
  }

  get schema(): NodeSpec {
    return {
      group: "block list",
      content: "checkbox_item+",
      attrs: {
        id: { default: null },
      },
      toDOM: () => ["ul", { class: this.name }, 0],
      parseDOM: [
        {
          tag: `[class="${this.name}"]`,
        },
      ],
    };
  }

  get plugins() {
    const userIdentifier = this.editor.props.userId;

    // Plugin to auto-assign IDs to checkbox lists
    const assignIdsPlugin = new Plugin({
      appendTransaction: (txs, _oldSt, newSt) => {
        const hasDocChanges = txs.some((t) => t.docChanged);
        if (!hasDocChanges) {
          return null;
        }

        const checkboxLists = findBlockNodes(newSt.doc, true).filter(
          (b) => b.node.type.name === this.name && !b.node.attrs.id
        );

        if (checkboxLists.length === 0) {
          return null;
        }

        let modifyTx = newSt.tr;
        checkboxLists.forEach((listBlock) => {
          modifyTx.setNodeAttribute(listBlock.pos, "id", generateUuid());
        });
        return modifyTx;
      },
    });

    // Plugin to provide NodeViews
    const nodeViewPlugin = new Plugin({
      props: {
        nodeViews: {
          [this.name]: (prosemirrorNode, editorView, getPosition) =>
            new CheckboxListNodeView(
              prosemirrorNode,
              editorView,
              getPosition,
              userIdentifier || ""
            ),
        },
      },
    });

    return [assignIdsPlugin, nodeViewPlugin];
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-7": toggleList(type, schema.nodes.checkbox_item),
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return () => toggleList(type, schema.nodes.checkbox_item);
  }

  inputRules({ type }: { type: NodeType }) {
    return [listWrappingInputRule(/^-?\s*(\[\s?\])\s$/i, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderList(node, "  ", () => "- ");
  }

  parseMarkdown() {
    return { block: "checkbox_list" };
  }
}

/**
 * Custom NodeView that wraps checkbox lists with a toggle control.
 */
class CheckboxListNodeView implements ProsemirrorNodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private toggleControl: HTMLButtonElement;
  private currentNode: ProsemirrorNode;
  private viewInstance: EditorView;
  private positionGetter: () => number | undefined;
  private userIdentifier: string;

  constructor(
    prosemirrorNode: ProsemirrorNode,
    editorView: EditorView,
    getPosition: () => number | undefined,
    userIdentifier: string
  ) {
    this.currentNode = prosemirrorNode;
    this.viewInstance = editorView;
    this.positionGetter = getPosition;
    this.userIdentifier = userIdentifier;

    // Build DOM structure
    const wrapperElement = document.createElement("div");
    wrapperElement.classList.add("checklist-wrapper");

    this.toggleControl = document.createElement("button");
    this.toggleControl.classList.add("checklist-completed-toggle");
    this.toggleControl.contentEditable = "false";
    this.toggleControl.addEventListener("click", this.handleToggleClick);

    this.contentDOM = document.createElement("ul");
    this.contentDOM.classList.add("checkbox_list");

    wrapperElement.appendChild(this.toggleControl);
    wrapperElement.appendChild(this.contentDOM);
    this.dom = wrapperElement;

    this.updateToggleState();
  }

  private handleToggleClick = (clickEvent: Event) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();

    const listId = this.currentNode.attrs.id;
    if (!listId) {
      return;
    }

    const storageKey = `checklist-${listId}-${this.userIdentifier}-hidden`;
    const currentlyCollapsed = !!Storage.get(storageKey);
    Storage.set(storageKey, !currentlyCollapsed);
    this.updateToggleState();
  };

  private updateToggleState() {
    const listId = this.currentNode.attrs.id;
    if (!listId) {
      this.toggleControl.style.display = "none";
      return;
    }

    const storageKey = `checklist-${listId}-${this.userIdentifier}-hidden`;
    const shouldCollapse = !!Storage.get(storageKey);

    // Count completed items
    let completedItemsCount = 0;
    this.currentNode.forEach((childNode) => {
      if (childNode.attrs.checked === true) {
        completedItemsCount++;
      }
    });

    // Show/hide button based on completed count
    if (completedItemsCount === 0) {
      this.toggleControl.style.display = "none";
      this.dom.classList.remove("completed-hidden");
    } else {
      this.toggleControl.style.display = "inline-block";
      this.toggleControl.textContent = shouldCollapse
        ? `Show ${completedItemsCount} completed`
        : "Hide completed";

      if (shouldCollapse) {
        this.dom.classList.add("completed-hidden");
      } else {
        this.dom.classList.remove("completed-hidden");
      }
    }
  }

  update(prosemirrorNode: ProsemirrorNode) {
    if (prosemirrorNode.type.name !== "checkbox_list") {
      return false;
    }
    this.currentNode = prosemirrorNode;
    this.updateToggleState();
    return true;
  }

  destroy() {
    this.toggleControl.removeEventListener("click", this.handleToggleClick);
  }
}
