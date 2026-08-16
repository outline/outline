import { DOMSerializer, type Node as ProsemirrorNode } from "prosemirror-model";
import type {
  Decoration,
  EditorView,
  NodeView,
  NodeViewConstructor,
} from "prosemirror-view";
import type { ServerStyleSheet } from "styled-components";
import type ReactNode from "@shared/editor/nodes/ReactNode";
import { errToString } from "@shared/utils/error";
import { extensionManager } from "@server/editor";
import Logger from "@server/logging/Logger";
import { ComponentView } from "./ComponentView";

/**
 * Renders a node with its plain `toDOM` spec – today's server export output –
 * as a static NodeView. Used for nodes that prefer toDOM, and as the fallback
 * when a component unexpectedly fails to render server-side.
 */
function renderToDOMFallback(node: ProsemirrorNode): NodeView {
  const toDOM = node.type.spec.toDOM;
  const tag = node.type.spec.inline ? "span" : "div";
  const rendered = toDOM
    ? DOMSerializer.renderSpec(document, toDOM(node))
    : { dom: document.createElement(tag), contentDOM: undefined };

  return {
    // renderSpec is typed to return a generic DOM node; our node specs always
    // produce an element.
    dom: rendered.dom as HTMLElement,
    contentDOM: rendered.contentDOM,
    update: () => false,
    ignoreMutation: () => true,
  };
}

/**
 * Builds the set of ProseMirror NodeViews used during server HTML export,
 * mirroring the browser editor: every extension with a React `component`
 * renders through {@link ComponentView}. A component that throws on
 * construction degrades gracefully to its `toDOM` output.
 *
 * @param sheet The per-export styled-components sheet the components render into.
 * @returns A map of node name to NodeView constructor.
 */
export function createNodeViews(
  sheet: ServerStyleSheet
): Record<string, NodeViewConstructor> {
  return Object.fromEntries(
    extensionManager.extensions
      .filter((extension: ReactNode) => extension.component)
      .filter((extension: ReactNode) => extension.allowComponentInStaticHTML)
      .map((extension: ReactNode) => [
        extension.name,
        (
          node: ProsemirrorNode,
          view: EditorView,
          getPos: () => number | undefined,
          decorations: readonly Decoration[]
        ): NodeView => {
          try {
            return new ComponentView(extension.component, {
              node,
              view,
              getPos,
              decorations,
              sheet,
            });
          } catch (err) {
            Logger.warn(
              "Component view failed to render, falling back to toDOM",
              {
                node: node.type.name,
                error: errToString(err),
              }
            );
            return renderToDOMFallback(node);
          }
        },
      ])
  ) as Record<string, NodeViewConstructor>;
}
