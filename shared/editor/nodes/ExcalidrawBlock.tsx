import { Token } from "markdown-it";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { ComponentProps } from "../types";
import Node from "./Node";
import ExcalidrawEmbed from "../components/ExcalidrawEmbed";

/**
 * Get empty SVG placeholder for a new Excalidraw diagram
 */
function getEmptyExcalidrawSVG(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#ffffff"/>
  <text x="400" y="300" text-anchor="middle" font-family="Arial" font-size="20" fill="#aaa">
    Click to start drawing
  </text>
</svg>`;
}

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
      draggable: false,
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

        // Safely parse SVG using DOMParser to avoid XSS
        const container = document.createElement("div");
        if (svgOnly && typeof window !== "undefined") {
          try {
            const parser = new window.DOMParser();
            const doc = parser.parseFromString(svgOnly, "image/svg+xml");
            const svgElement = doc.querySelector("svg");

            // Check for parsing errors
            const parserError = doc.querySelector("parsererror");
            if (!parserError && svgElement) {
              container.appendChild(svgElement);
            }
          } catch (error) {
            // oxlint-disable-next-line no-console
            console.warn("[ExcalidrawBlock] Failed to parse SVG:", error);
          }
        }

        const outerDiv = document.createElement("div");
        outerDiv.className = "excalidraw-block";
        outerDiv.setAttribute("data-xml-decl", xmlDecl);
        outerDiv.setAttribute("data-doctype", doctype);
        outerDiv.setAttribute("data-height", String(node.attrs.height || 500));
        outerDiv.contentEditable = "false";
        outerDiv.appendChild(container);

        return outerDiv;
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


  component = (props: ComponentProps) => {
    const { node, getPos, isEditable } = props;
    const documentId = this.editor?.props.id || "";
    const position = typeof getPos === "function" ? getPos() : 0;

    return (
      <ExcalidrawEmbed
        svg={node.attrs.svg || ""}
        documentId={documentId}
        position={position}
        height={node.attrs.height}
        isSelected={props.isSelected}
        isEditable={isEditable}
        onSave={(data) => {
          // Update node attributes when iframe saves
          if (typeof getPos === "function") {
            try {
              const { view } = this.editor;
              if (!view) {
                // oxlint-disable-next-line no-console
                console.warn("[ExcalidrawBlock] Cannot save: editor view not available");
                return;
              }

              const pos = getPos();
              if (pos === null || pos === undefined || pos < 0) {
                // oxlint-disable-next-line no-console
                console.warn("[ExcalidrawBlock] Cannot save: invalid position", pos);
                return;
              }

              const { tr } = view.state;
              if (pos >= tr.doc.content.size) {
                // oxlint-disable-next-line no-console
                console.warn("[ExcalidrawBlock] Cannot save: position out of bounds", pos, tr.doc.content.size);
                return;
              }

              const currentNode = tr.doc.nodeAt(pos);
              if (!currentNode) {
                // oxlint-disable-next-line no-console
                console.warn("[ExcalidrawBlock] Cannot save: node not found at position", pos);
                return;
              }

              // Only dispatch if SVG actually changed to avoid unnecessary updates
              const svgChanged = currentNode.attrs.svg !== data.svg;
              const heightChanged = data.height && currentNode.attrs.height !== data.height;

              if (!svgChanged && !heightChanged) {
                return; // No changes, skip dispatch
              }

              const transaction = tr
                .setNodeMarkup(pos, undefined, {
                  ...currentNode.attrs,
                  svg: data.svg,
                  height: data.height || currentNode.attrs.height,
                })
                .setMeta("addToHistory", true);

              view.dispatch(transaction);
            } catch (error) {
              // Fix #2: Log errors instead of silently ignoring
              // oxlint-disable-next-line no-console
              console.error("[ExcalidrawBlock] Save failed:", error);
            }
          }
        }}
      />
    );
  };
}
