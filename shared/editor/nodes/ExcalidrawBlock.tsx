import { Token } from "markdown-it";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import * as React from "react";
import { getEmptyExcalidrawSVG } from "../lib/excalidraw/svgExtractor";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { ComponentProps } from "../types";
import Node from "./Node";

// Lazy load the Excalidraw component to avoid server-side import errors
const ExcalidrawComponent = React.lazy(() => import("../components/Excalidraw").then(m => ({ default: m.default })));

/**
 * Excalidraw diagram block node.
 * Stores SVG with embedded scene data inline in the document.
 */
export default class ExcalidrawBlock extends Node {
  get name() {
    return "excalidraw";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        svg: {
          default: "",
          validate: "string",
        },
        height: {
          default: 500,
        },
      },
      group: "block",
      atom: true,
      selectable: true,
      draggable: true,
      parseDOM: [
        {
          tag: "div.excalidraw-block",
          getAttrs: (dom: HTMLDivElement) => {
            const svg = dom.querySelector("svg")?.outerHTML || "";
            const xmlDecl = dom.dataset.xmlDecl || "";
            const doctype = dom.dataset.doctype || "";
            const height = dom.dataset.height ? parseInt(dom.dataset.height, 10) : 500;
            return {
              svg: xmlDecl + doctype + svg,
              height,
            };
          },
        },
      ],
      toDOM: (node) => {
        // Parse SVG to separate XML declaration and DOCTYPE
        const svgContent = node.attrs.svg || "";
        const xmlDeclMatch = svgContent.match(/^(<\?xml[^>]*\?>)\s*/);
        const doctypeMatch = svgContent.match(/<!DOCTYPE[^>]*>/);
        const xmlDecl = xmlDeclMatch ? xmlDeclMatch[1] : "";
        const doctype = doctypeMatch ? doctypeMatch[0] : "";
        const svgOnly = svgContent
          .replace(/^<\?xml[^>]*\?>\s*/, "")
          .replace(/<!DOCTYPE[^>]*>\s*/, "");

        return [
          "div",
          {
            class: "excalidraw-block",
            "data-xml-decl": xmlDecl,
            "data-doctype": doctype,
            "data-height": String(node.attrs.height || 500),
            contentEditable: "false",
          },
          // Use dangerouslySetInnerHTML equivalent by parsing SVG
          ["div", { innerHTML: svgOnly }],
        ];
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    // Output raw SVG content
    state.write(node.attrs.svg || "");
    state.ensureNewLine();
    state.write("\n");
  }

  commands({ type }: { type: NodeType }) {
    return {
      excalidraw: (): Command => (state, dispatch) => {
        // Create a new Excalidraw block with empty SVG
        const svg = getEmptyExcalidrawSVG();
        const node = type.create({ svg });

        if (dispatch) {
          const { tr } = state;
          tr.replaceSelectionWith(node);
          dispatch(tr);
        }

        return true;
      },
    };
  }

  parseMarkdown() {
    return {
      block: "excalidraw",
      getAttrs: (token: Token) => {
        // Extract SVG from token content
        // The SVG should be in the token content
        const content = token.content || "";

        // Match SVG with optional XML declaration and DOCTYPE
        const svgMatch = content.match(
          /(<\?xml[^>]*\?>)?\s*(<!DOCTYPE[^>]*>)?\s*(<svg[\s\S]*?<\/svg>)/i
        );

        if (svgMatch) {
          const xmlDecl = svgMatch[1] || "";
          const doctype = svgMatch[2] || "";
          const svg = svgMatch[3] || "";
          return {
            svg: xmlDecl + doctype + svg,
          };
        }

        return { svg: content };
      },
    };
  }

  handleChangeSize =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    ({ width, height }: { width?: number; height?: number }) => {
      // Only update if height has actually changed (width is not in schema)
      if (node.attrs.height === height) {
        return;
      }

      try {
        const { view } = this.editor;
        if (!view) {
          console.error("[ExcalidrawBlock] No editor view available");
          return;
        }

        const pos = getPos();
        if (pos === null || pos === undefined || pos < 0) {
          console.error("[ExcalidrawBlock] Invalid position from getPos:", pos);
          return;
        }

        const { tr } = view.state;

        // Validate position is within document bounds
        if (pos >= tr.doc.content.size) {
          console.error("[ExcalidrawBlock] Position out of bounds:", pos, "doc size:", tr.doc.content.size);
          return;
        }

        const transaction = tr
          .setNodeMarkup(pos, undefined, {
            ...node.attrs,
            height,
          })
          .setMeta("addToHistory", true);

        // Dispatch without changing selection to avoid component unmount/remount
        view.dispatch(transaction);
      } catch (error) {
        console.error("[ExcalidrawBlock] Error in handleChangeSize:", error);
      }
    };

  component = (props: ComponentProps) => (
    <React.Suspense fallback={<div>Loading Excalidraw...</div>}>
      <ExcalidrawComponent
        {...props}
        editor={this.editor}
        documentId={this.editor?.props.id}
        theme={this.editor?.props.theme.isDark ? "dark" : "light"}
        user={this.editor?.props.userId ? {
          id: this.editor.props.userId,
          name: "User"
        } : undefined}
        onChangeSize={this.handleChangeSize(props)}
      />
    </React.Suspense>
  );
}
