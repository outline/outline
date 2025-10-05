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
                return;
              }

              const pos = getPos();
              if (pos === null || pos === undefined || pos < 0) {
                return;
              }

              const { tr } = view.state;
              if (pos >= tr.doc.content.size) {
                return;
              }

              const currentNode = tr.doc.nodeAt(pos);
              if (!currentNode) {
                return;
              }

              const transaction = tr
                .setNodeMarkup(pos, undefined, {
                  ...currentNode.attrs,
                  svg: data.svg,
                  height: data.height || currentNode.attrs.height,
                })
                .setMeta("addToHistory", true);

              view.dispatch(transaction);
            } catch {
              // Silently ignore save errors
            }
          }
        }}
      />
    );
  };
}
