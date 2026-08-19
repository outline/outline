import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { Decoration, EditorView, NodeView } from "prosemirror-view";
import type { FunctionComponent } from "react";
import ReactDOM from "react-dom";
import {
  type ServerStyleSheet,
  StyleSheetManager,
  ThemeProvider,
} from "styled-components";
import type { ComponentProps } from "@shared/editor/types";
import light from "@shared/styles/theme";

type ComponentViewOptions = {
  /** The node the view is responsible for. */
  node: ProsemirrorNode;
  /** The editor view instance. */
  view: EditorView;
  /** A function that returns the current position of the node. */
  getPos: () => number | undefined;
  /** The decorations applied to the node. */
  decorations: readonly Decoration[];
  /** The per-export styled-components sheet collecting the component's styles. */
  sheet: ServerStyleSheet;
};

/**
 * Server-side ProseMirror NodeView that renders a node's React `component` –
 * the same one used in the browser – into a headless jsdom document, so HTML
 * export matches the in-app rendering. Rendering is synchronous under React 17;
 * content-bearing nodes expose a `contentDOM` hole that ProseMirror fills,
 * while leaf nodes render entirely from React.
 */
export class ComponentView implements NodeView {
  /** The DOM element the node is rendered into. */
  public dom: HTMLElement;
  /** The element ProseMirror-managed child content is mounted within, if any. */
  public contentDOM?: HTMLElement;

  private node: ProsemirrorNode;
  private decorations: readonly Decoration[];
  private className: string;

  constructor(
    component: FunctionComponent<Omit<ComponentProps, "theme">>,
    { node, view, getPos, decorations, sheet }: ComponentViewOptions
  ) {
    this.node = node;
    this.decorations = decorations;

    const tag = node.type.spec.inline ? "span" : "div";
    this.dom = document.createElement(tag);
    if (!node.isLeaf) {
      this.contentDOM = document.createElement(tag);
    }

    this.className = `component-${node.type.name}`;
    this.dom.classList.add(this.className);
    this.applyDecorationClasses();

    // Theme is delivered via ThemeProvider context per ReactNode's
    // `Omit<ComponentProps, "theme">` contract.
    const props: Omit<ComponentProps, "theme"> = {
      node,
      view,
      isSelected: false,
      isEditable: false,
      getPos: () => getPos() ?? 0,
      decorations: [...decorations],
      contentRef: this.handleContentRef,
    };

    const Component = component;
    ReactDOM.render(
      <StyleSheetManager sheet={sheet.instance}>
        <ThemeProvider theme={light}>
          <Component {...props} />
        </ThemeProvider>
      </StyleSheetManager>,
      this.dom
    );
  }

  /**
   * The document is static, so never reuse a view for a changed node; forcing
   * re-creation keeps the render pure. Returning false also stops ProseMirror's
   * DOMObserver from reacting to late passive-effect renders.
   */
  public update(): boolean {
    return false;
  }

  /** Ignore all mutations so late React effect renders don't disturb ProseMirror. */
  public ignoreMutation(): boolean {
    return true;
  }

  /** Unmount the React tree, clearing any timers the component scheduled. */
  public destroy(): void {
    ReactDOM.unmountComponentAtNode(this.dom);
  }

  /**
   * Apply decoration classes (e.g. revision diff markers) to the DOM element,
   * extracting them from inline decorations that overlap this node's position.
   */
  private applyDecorationClasses(): void {
    this.decorations.forEach((decoration) => {
      const attrs = (
        decoration as Decoration & { type?: { attrs?: { class?: string } } }
      ).type?.attrs;
      if (attrs?.class) {
        attrs.class.split(" ").forEach((className) => {
          if (className) {
            this.dom.classList.add(className);
          }
        });
      }
    });
  }

  /**
   * Ref callback marking the element ProseMirror-managed content is mounted
   * within. Refs fire synchronously under React 17, so `contentDOM` is attached
   * before the constructor returns.
   */
  private handleContentRef = (element: HTMLElement | null) => {
    if (
      element &&
      this.contentDOM &&
      element !== this.contentDOM.parentElement
    ) {
      element.appendChild(this.contentDOM);
    }
  };
}
