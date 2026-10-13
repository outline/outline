import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { findParentNodeClosestToPos } from "@shared/editor/queries/findParentNode";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";

/** The kind of block that a drag target points at. */
export type DragTargetKind = "block" | "listItem" | "checkboxItem";

/** A document position and the kind of block found there. */
export interface ResolvedDragTarget {
  /** Position of the block in the document. */
  pos: number;

  /** The kind of block at the position. */
  kind: DragTargetKind;
}

const LIST_TYPES = ["bullet_list", "ordered_list", "checkbox_list"];

// Distance outside the content column in which the cursor still finds a block.
const GUTTER_HIT_WIDTH = 60;

// Inset from the content edges, so that posAtCoords lands inside the block.
const CONTENT_INSET = 1;

/**
 * A block in the editor that the drag handle can attach to. Holds the
 * position of the block in the document and the DOM element that the handle
 * aligns with, which is not always the node's own DOM (e.g. Mermaid diagrams).
 */
export class DragTarget {
  /** Position of the block in the document. */
  public readonly pos: number;

  /** The DOM element that the handle aligns with. */
  public readonly element: HTMLElement;

  /** The kind of block. */
  public readonly kind: DragTargetKind;

  constructor(pos: number, element: HTMLElement, kind: DragTargetKind) {
    this.pos = pos;
    this.element = element;
    this.kind = kind;
  }

  /**
   * Finds the block under the cursor, also when the cursor is in the gutter
   * to the side of the content.
   *
   * @param view - the editor view.
   * @param event - the mouse event.
   * @returns the target, or null if there is no block under the cursor.
   */
  public static fromEvent(
    view: EditorView,
    event: MouseEvent
  ): DragTarget | null {
    const rect = view.dom.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) {
      return null;
    }
    const style = window.getComputedStyle(view.dom);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const contentLeft = rect.left + paddingLeft + CONTENT_INSET;
    const contentRight = rect.right - paddingRight - CONTENT_INSET;
    if (
      event.clientX < contentLeft - GUTTER_HIT_WIDTH ||
      event.clientX > contentRight + GUTTER_HIT_WIDTH
    ) {
      return null;
    }
    const projectedX = Math.max(
      contentLeft,
      Math.min(contentRight, event.clientX)
    );

    // Mermaid diagrams hide their source code block and render an SVG widget
    // next to it — target the underlying code block but anchor the handle to
    // the visible diagram element.
    const mermaid = this.mermaidFromEvent(view, event, projectedX);
    if (mermaid) {
      return mermaid;
    }

    const coords = view.posAtCoords({
      left: projectedX,
      top: event.clientY,
    });
    if (!coords) {
      return null;
    }
    const resolved = this.resolvePos(view.state, coords.pos);
    if (!resolved) {
      return null;
    }
    const dom = view.nodeDOM(resolved.pos);
    if (!(dom instanceof HTMLElement)) {
      return null;
    }
    return new DragTarget(resolved.pos, dom, resolved.kind);
  }

  /**
   * Finds the block that a DOM element renders, e.g. to update a target after
   * the document changes.
   *
   * @param view - the editor view.
   * @param element - the DOM element that the handle aligns with.
   * @returns the target, or null if the element is no longer in the editor.
   */
  public static fromElement(
    view: EditorView,
    element: HTMLElement
  ): DragTarget | null {
    if (!element.isConnected) {
      return null;
    }
    if (element.classList.contains(EditorStyleHelper.mermaidDiagram)) {
      const pos = this.mermaidPos(view, element);
      return pos === null ? null : new DragTarget(pos, element, "block");
    }
    const parent = element.parentNode;
    if (!parent) {
      return null;
    }
    let pos: number;
    try {
      pos = view.posAtDOM(
        parent,
        Array.from(parent.childNodes).indexOf(element)
      );
    } catch {
      return null;
    }
    const node = view.state.doc.nodeAt(pos);
    if (!node || view.nodeDOM(pos) !== element) {
      return null;
    }
    return new DragTarget(pos, element, this.kindOf(node));
  }

  /**
   * Finds the draggable block that contains a document position.
   *
   * @param state - the editor state.
   * @param pos - a position in the document.
   * @returns the block position and kind, or null if there is no draggable block.
   */
  public static resolvePos(
    state: EditorState,
    pos: number
  ): ResolvedDragTarget | null {
    const $pos = state.doc.resolve(pos);

    const listItem = findParentNodeClosestToPos(
      $pos,
      (node) => this.kindOf(node) !== "block"
    );
    if (listItem) {
      return { pos: listItem.pos, kind: this.kindOf(listItem.node) };
    }

    if ($pos.depth >= 1) {
      const node = $pos.node(1);
      if (LIST_TYPES.includes(node.type.name)) {
        return null;
      }

      // Skip empty top-level paragraphs — the block menu trigger is shown
      // there instead.
      if (node.type.name === "paragraph" && node.content.size === 0) {
        return null;
      }

      // Floated and full-width images sit outside the content column, so a
      // handle in the gutter would not line up with them.
      if (this.hasLayoutImage(node)) {
        return null;
      }
      return { pos: $pos.before(1), kind: "block" };
    }

    // Hovering on a top-level atom block (video, etc.) — there are no
    // positions inside an atom, so posAtCoords lands at depth 0 between
    // siblings of the doc. Pick whichever neighbouring atom block the
    // position is adjacent to.
    const after = $pos.nodeAfter;
    if (after?.isBlock && after.isAtom) {
      return { pos: $pos.pos, kind: "block" };
    }
    const before = $pos.nodeBefore;
    if (before?.isBlock && before.isAtom) {
      return { pos: $pos.pos - before.nodeSize, kind: "block" };
    }
    return null;
  }

  /**
   * Whether the editor shows its own controls for this block, which would
   * overlap the drag handle, e.g. a table that holds the selection.
   *
   * @param state - the editor state.
   * @returns true if the drag handle should be hidden for this block.
   */
  public hasOwnControls(state: EditorState): boolean {
    const node = state.doc.nodeAt(this.pos);
    if (node?.type.name !== "table") {
      return false;
    }
    const { from, to } = state.selection;
    return from > this.pos && to < this.pos + node.nodeSize;
  }

  /**
   * Whether this target points at the same block as another target.
   *
   * @param other - the target to compare with.
   * @returns true if both targets have the same position and element.
   */
  public equals(other: DragTarget | null): boolean {
    return !!other && this.pos === other.pos && this.element === other.element;
  }

  private static kindOf(node: ProsemirrorNode): DragTargetKind {
    switch (node.type.name) {
      case "list_item":
        return "listItem";
      case "checkbox_item":
        return "checkboxItem";
      default:
        return "block";
    }
  }

  private static hasLayoutImage(node: ProsemirrorNode): boolean {
    if (!node.isTextblock) {
      return false;
    }
    let found = false;
    node.forEach((child) => {
      if (child.type.name === "image" && child.attrs.layoutClass) {
        found = true;
      }
    });
    return found;
  }

  private static mermaidFromEvent(
    view: EditorView,
    event: MouseEvent,
    projectedX: number
  ): DragTarget | null {
    // Look at the element directly under the cursor, and at the projected X
    // inside the editor so we still find the diagram when the cursor sits in
    // the left gutter where the handle is rendered.
    const eventTarget = event.target instanceof Element ? event.target : null;
    const projectedTarget =
      projectedX !== event.clientX
        ? document.elementFromPoint(projectedX, event.clientY)
        : null;
    const diagram =
      eventTarget?.closest<HTMLElement>(
        `.${EditorStyleHelper.mermaidDiagram}`
      ) ??
      (projectedTarget instanceof Element
        ? projectedTarget.closest<HTMLElement>(
            `.${EditorStyleHelper.mermaidDiagram}`
          )
        : null);
    if (!diagram) {
      return null;
    }
    const pos = this.mermaidPos(view, diagram);
    return pos === null ? null : new DragTarget(pos, diagram, "block");
  }

  private static mermaidPos(
    view: EditorView,
    diagram: HTMLElement
  ): number | null {
    const codeBlockDom = diagram.previousElementSibling;
    if (!(codeBlockDom instanceof HTMLElement)) {
      return null;
    }
    let pos: number;
    try {
      pos = view.posAtDOM(codeBlockDom, 0);
    } catch {
      return null;
    }
    if (pos < 0) {
      return null;
    }
    const $pos = view.state.doc.resolve(pos);
    const blockPos = $pos.depth > 0 ? $pos.before($pos.depth) : 0;
    return view.state.doc.nodeAt(blockPos) ? blockPos : null;
  }
}
