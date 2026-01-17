import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorView, Decoration } from "prosemirror-view";
import type { FunctionComponent } from "react";
import type Extension from "@shared/editor/lib/Extension";
import type { ComponentProps } from "@shared/editor/types";
import type { Editor } from "~/editor";
import { NodeViewRenderer } from "./NodeViewRenderer";

type ComponentViewConstructor = {
  /** The editor instance. */
  editor: Editor;
  /** The extension the view belongs to. */
  extension: Extension;
  /** The node that the view is responsible for. */
  node: ProsemirrorNode;
  /** The editor view instance. */
  view: EditorView;
  /** A function that returns the current position of the node. */
  getPos: () => number;
  /** The decorations applied to the node. */
  decorations: Decoration[];
};

export default class ComponentView {
  /** The React component to render. */
  component: FunctionComponent<ComponentProps>;
  /** The editor instance. */
  editor: Editor;
  /** The extension the view belongs to. */
  extension: Extension;
  /** The node that the view is responsible for. */
  node: ProsemirrorNode;
  /** The editor view instance. */
  view: EditorView;
  /** A function that returns the current position of the node. */
  getPos: () => number;
  /** The decorations applied to the node. */
  decorations: Decoration[];
  /** The renderer instance. */
  renderer: NodeViewRenderer<ComponentProps>;
  /** Whether the node is selected. */
  isSelected = false;
  /** The DOM element that the node is rendered into. */
  dom: HTMLElement | null;
  /** The base class name for the node's DOM element. */
  className?: string;

  // See https://prosemirror.net/docs/ref/#view.NodeView
  constructor(
    component: FunctionComponent<ComponentProps>,
    {
      editor,
      extension,
      node,
      view,
      getPos,
      decorations,
    }: ComponentViewConstructor
  ) {
    this.component = component;
    this.editor = editor;
    this.extension = extension;
    this.getPos = getPos;
    this.decorations = decorations;
    this.node = node;
    this.view = view;
    this.dom = node.type.spec.inline
      ? document.createElement("span")
      : document.createElement("div");

    this.className = `component-${node.type.name}`;
    this.dom.classList.add(this.className);
    this.renderer = new NodeViewRenderer(this.dom, this.component, this.props);

    // Add the renderer to the editor's set of renderers so that it is included in the React tree.
    this.editor.renderers.add(this.renderer);

    // Apply decoration classes to the DOM element.
    this.applyDecorationClasses();
  }

  update(node: ProsemirrorNode, decorations: Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    // Ensure we don't reuse NodeViews for different nodes that have a distinct identity
    // This prevents attribute swapping during drag operations.
    if (
      this.node.attrs.id !== undefined &&
      node.attrs.id !== this.node.attrs.id
    ) {
      return false;
    }

    this.node = node;
    this.decorations = decorations;
    this.applyDecorationClasses();
    this.renderer.updateProps(this.props);
    return true;
  }

  /**
   * Apply decoration classes to the DOM element.
   * Extracts classes from inline decorations that overlap with this node's position.
   */
  private applyDecorationClasses() {
    if (!this.dom) {
      return;
    }

    // Remove all existing decoration classes.
    this.dom.classList.forEach((className) => {
      if (className !== this.className) {
        this.dom?.classList.remove(className);
      }
    });

    // Apply classes from inline decorations.
    this.decorations.forEach((decoration) => {
      // For inline decorations, attrs contain the class property.
      const attrs = (decoration as any).type?.attrs;
      if (attrs?.class) {
        const classes = attrs.class.split(" ");
        classes.forEach((className: string) => {
          if (className && this.dom) {
            this.dom.classList.add(className);
          }
        });
      }
    });
  }

  selectNode() {
    if (this.view.editable) {
      this.isSelected = true;
      this.renderer.updateProps(this.props);
    }
  }

  deselectNode() {
    if (this.view.editable) {
      this.isSelected = false;
      this.renderer.updateProps(this.props);
    }
  }

  stopEvent(event: Event) {
    return (
      event.type !== "mousedown" &&
      !event.type.startsWith("drag") &&
      !event.type.startsWith("drop")
    );
  }

  destroy() {
    this.editor.renderers.delete(this.renderer);
    this.dom = null;
  }

  ignoreMutation() {
    return true;
  }

  get props() {
    return {
      node: this.node,
      view: this.view,
      isSelected: this.isSelected,
      isEditable: this.view.editable,
      getPos: this.getPos,
      decorations: this.decorations,
    } as ComponentProps;
  }
}
