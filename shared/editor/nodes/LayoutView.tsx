import type { Node as ProsemirrorNode } from "prosemirror-model";
import * as React from "react";
import ReactDOM from "react-dom";
import type { EditorView, NodeView } from "prosemirror-view";
import styled from "styled-components";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/** Minimum percentage width a single column may be resized to. */
const MIN_WIDTH = 15;

/**
 * Visual affordance rendered between two columns. The drag behaviour itself is
 * handled by {@link LayoutView}; this component only renders the chrome.
 */
const Handle = styled.div`
  width: 100%;
  height: 32px;
  max-height: 60%;
  border-radius: 2px;
  background: ${(props) => props.theme.divider ?? "currentColor"};
  opacity: 0;
  transition: opacity 150ms ease-in-out;
`;

/**
 * Custom NodeView for the layout block. Renders the columns into a flex
 * container and mounts a React resize handle between them that adjusts the
 * width of the two adjacent columns.
 */
export class LayoutView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLDivElement;

  private node: ProsemirrorNode;
  private view: EditorView;
  private getPos: () => number | undefined;
  private handle: HTMLDivElement;
  private dragging: { startX: number; width: number } | null = null;

  constructor(
    node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;

    this.dom = document.createElement("div");
    this.dom.className = EditorStyleHelper.layout;

    this.contentDOM = document.createElement("div");
    this.contentDOM.className = EditorStyleHelper.layoutContent;
    this.dom.appendChild(this.contentDOM);

    this.handle = document.createElement("div");
    this.handle.className = EditorStyleHelper.layoutResizeHandle;
    this.handle.contentEditable = "false";
    this.handle.addEventListener("pointerdown", this.handlePointerDown);
    ReactDOM.render(<Handle />, this.handle);
    this.dom.appendChild(this.handle);

    requestAnimationFrame(this.updateHandlePosition);
  }

  update(node: ProsemirrorNode) {
    if (node.type !== this.node.type) {
      return false;
    }
    this.node = node;
    requestAnimationFrame(this.updateHandlePosition);
    return true;
  }

  ignoreMutation(mutation: MutationRecord) {
    // Allow ProseMirror to manage the content, but ignore mutations to the
    // non-editable handle.
    return this.handle.contains(mutation.target);
  }

  destroy() {
    this.handle.removeEventListener("pointerdown", this.handlePointerDown);
    ReactDOM.unmountComponentAtNode(this.handle);
    this.removeWindowListeners();
  }

  /** Position the handle over the boundary between the two columns. */
  private updateHandlePosition = () => {
    const first = this.contentDOM.firstElementChild as HTMLElement | null;
    if (!first || !this.contentDOM.offsetWidth) {
      return;
    }
    const fraction = first.offsetWidth / this.contentDOM.offsetWidth;
    this.handle.style.left = `${fraction * 100}%`;
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.view.editable) {
      return;
    }
    event.preventDefault();
    const first = this.contentDOM.firstElementChild as HTMLElement | null;
    if (!first || !this.contentDOM.offsetWidth) {
      return;
    }
    this.dragging = {
      startX: event.clientX,
      width: (first.offsetWidth / this.contentDOM.offsetWidth) * 100,
    };
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.dragging || !this.contentDOM.offsetWidth) {
      return;
    }
    const delta =
      ((event.clientX - this.dragging.startX) / this.contentDOM.offsetWidth) *
      100;
    const left = this.clamp(this.dragging.width + delta);
    const first = this.contentDOM.children[0] as HTMLElement | undefined;
    const second = this.contentDOM.children[1] as HTMLElement | undefined;
    if (first && second) {
      first.style.flex = `0 0 ${left}%`;
      second.style.flex = `0 0 ${100 - left}%`;
    }
    this.updateHandlePosition();
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.dragging || !this.contentDOM.offsetWidth) {
      this.removeWindowListeners();
      return;
    }
    const delta =
      ((event.clientX - this.dragging.startX) / this.contentDOM.offsetWidth) *
      100;
    const left = Math.round(this.clamp(this.dragging.width + delta));
    this.dragging = null;
    this.removeWindowListeners();

    const pos = this.getPos();
    if (pos === undefined || this.node.childCount < 2) {
      return;
    }
    const firstPos = pos + 1;
    const secondPos = firstPos + this.node.child(0).nodeSize;
    const tr = this.view.state.tr;
    tr.setNodeMarkup(firstPos, undefined, {
      ...this.node.child(0).attrs,
      width: left,
    });
    tr.setNodeMarkup(secondPos, undefined, {
      ...this.node.child(1).attrs,
      width: 100 - left,
    });
    this.view.dispatch(tr);
  };

  private removeWindowListeners() {
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
  }

  private clamp(value: number) {
    return Math.max(MIN_WIDTH, Math.min(100 - MIN_WIDTH, value));
  }
}
