import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorView, Decoration } from "prosemirror-view";
import { FunctionComponent } from "react";
import Extension from "@shared/editor/lib/Extension";
import { ComponentProps } from "@shared/editor/types";
import { Editor } from "~/editor";
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

    this.dom.classList.add(`component-${node.type.name}`);
    this.renderer = new NodeViewRenderer(this.dom, this.component, this.props);

    // Add the renderer to the editor's set of renderers so that it is included in the React tree.
    this.editor.renderers.add(this.renderer);
  }

  update(node: ProsemirrorNode) {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.renderer.updateProps(this.props);
    return true;
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
    return event.type !== "mousedown" && !event.type.startsWith("drag");
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
    } as ComponentProps;
  }
}
