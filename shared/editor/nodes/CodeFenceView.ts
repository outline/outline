import { t } from "i18next";
import { DOMSerializer, type Node as ProsemirrorNode } from "prosemirror-model";
import type {
  Decoration,
  NodeView,
  ViewMutationRecord,
} from "prosemirror-view";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/**
 * Custom NodeView for code blocks that adds a toggle button to collapse and
 * expand tall blocks. The button sits inside the block so it can stick to the
 * bottom of the viewport while the block is in view.
 */
export class CodeFenceView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  private node: ProsemirrorNode;
  private toggle: HTMLDivElement;
  private button: HTMLButtonElement;

  constructor(node: ProsemirrorNode, decorations: readonly Decoration[]) {
    const spec = node.type.spec.toDOM?.(node);
    if (!spec) {
      throw new Error(`Missing toDOM for ${node.type.name}`);
    }

    const { dom, contentDOM } = DOMSerializer.renderSpec(document, spec);
    if (!(dom instanceof HTMLElement) || !contentDOM) {
      throw new Error(`Invalid toDOM for ${node.type.name}`);
    }

    this.node = node;
    this.dom = dom;
    this.contentDOM = contentDOM;

    this.toggle = document.createElement("div");
    this.toggle.className = EditorStyleHelper.codeBlockToggle;
    this.toggle.contentEditable = "false";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.toggle.appendChild(this.button);
    this.dom.appendChild(this.toggle);

    this.syncToggle(decorations);
  }

  update(node: ProsemirrorNode, decorations: readonly Decoration[]) {
    if (!node.sameMarkup(this.node)) {
      return false;
    }

    this.node = node;
    this.syncToggle(decorations);
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    return this.toggle.contains(mutation.target);
  }

  /**
   * Show the toggle on collapsible blocks with a label for the current state.
   *
   * @param decorations the outer decorations of the node.
   */
  private syncToggle(decorations: readonly Decoration[]) {
    const decoration = decorations.find((d) => d.spec.collapsible);
    this.toggle.style.display = decoration ? "" : "none";
    this.button.textContent = decoration?.spec.collapsed
      ? t("Expand")
      : t("Collapse");
  }
}
