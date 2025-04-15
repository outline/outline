import { Token } from "markdown-it";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Command, NodeSelection } from "prosemirror-state";
import * as React from "react";
import { lazy, Suspense } from "react";
import { Primitive } from "utility-types";
import { getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import insertFiles from "../commands/insertFiles";
import toggleWrap from "../commands/toggleWrap";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/links"; // Reusing attachment rule for parsing links
import { ComponentProps } from "../types";
import Node from "./Node";

// Lazy load the component that contains react-pdf and CSS imports
const PdfEmbedComponent = lazy(() => import("../components/PdfEmbed"));

// Fallback component while lazy component loads
const PdfLoadingFallback = () => (
  // Simplified fallback without theme dependency
  <div style={{ padding: "10px", color: "#ccc" }}>Loading PDF...</div>
);

export default class Pdf extends Node {
  get name() {
    return "pdf_document"; // Changed name
  }

  // Reuse attachment rules for parsing markdown links that might represent PDFs
  get rulePlugins() {
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        id: {
          // Keep ID for potential future use
          default: null,
        },
        href: {
          // URL of the uploaded PDF
          default: null,
        },
        title: {
          // Original filename
          default: "PDF Document",
        },
        size: {
          // File size
          default: 0,
        },
        // Add height attribute for persistence
        height: {
          default: 500, // Default height in pixels
        },
      },
      group: "block",
      defining: true,
      atom: true, // Treat as a single unit in the editor
      parseDOM: [
        {
          // Basic parsing from a link, similar to Attachment
          // More robust parsing might look for specific data attributes
          priority: 101, // Higher priority than attachment
          tag: "a.pdf-attachment", // Use a specific class if possible
          getAttrs: (dom: HTMLAnchorElement) => ({
            id: dom.id,
            title: dom.innerText || dom.dataset.title || "PDF Document",
            href: dom.getAttribute("href"),
            size: parseInt(dom.dataset.size || "0", 10),
          }),
        },
      ],
      toDOM: (node) => [
        // Represent as a link in the raw DOM for fallback
        // The React component handles the actual rendering
        "a",
        {
          class: `pdf-attachment`,
          id: node.attrs.id,
          href: sanitizeUrl(node.attrs.href),
          "data-title": node.attrs.title,
          "data-size": node.attrs.size,
          "data-height": node.attrs.height,
        },
        String(node.attrs.title),
      ],
      toPlainText: (node) => `[PDF: ${node.attrs.title}]`,
    };
  }

  // Keep selection handling similar to Attachment
  handleSelect =
    ({ getPos }: ComponentProps) =>
    () => {
      const { view } = this.editor;
      const $pos = view.state.doc.resolve(getPos());
      const transaction = view.state.tr.setSelection(new NodeSelection($pos));
      view.dispatch(transaction);
    };

  // Use lazy-loaded component wrapped in suspense
  component = (props: ComponentProps) => (
    // Pass props AND the handleSelect method down
    <Suspense fallback={<PdfLoadingFallback />}>
      <PdfEmbedComponent {...props} onSelect={this.handleSelect(props)} />
    </Suspense>
  );

  commands({ type }: { type: NodeType }) {
    return {
      createPdfAttachment: (attrs: Record<string, Primitive>) =>
        toggleWrap(type, attrs), // Use toggleWrap to insert the node

      // Command to trigger file upload and insertion
      uploadPdfPlaceholder: (): Command => (state, _dispatch) => {
        const { view } = this.editor;
        const { uploadFile, onFileUploadStart, onFileUploadStop } =
          this.editor.props;

        if (!uploadFile) {
          throw new Error("uploadFile prop is required to upload PDFs");
        }

        // create an input element and click to trigger picker
        const inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.accept = ".pdf"; // accept only pdfs
        inputElement.onchange = (event) => {
          const files = getEventFiles(event);
          if (files.length > 0) {
            void insertFiles(view, event, state.selection.from, files, {
              uploadFile,
              onFileUploadStart,
              onFileUploadStop,
              dictionary: this.options.dictionary,
              replaceExisting: false,
              nodeType: type, // Specify the node type to create
            });
          }
        };
        inputElement.click();

        return true;
      },

      // Delete command (same as attachment)
      deletePdfAttachment: (): Command => (state, _dispatch) => {
        _dispatch?.(state.tr.deleteSelection());
        return true;
      },

      // Replace command (similar to attachment)
      replacePdfAttachment: (): Command => (state) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }

        const { view } = this.editor;
        const { node } = state.selection;
        const { uploadFile, onFileUploadStart, onFileUploadStop } =
          this.editor.props;

        if (!uploadFile) {
          throw new Error("uploadFile prop is required");
        }
        if (node.type.name !== this.name) {
          return false;
        }

        const inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.accept = ".pdf";
        inputElement.onchange = (event) => {
          const files = getEventFiles(event);
          if (files.length > 0) {
            void insertFiles(view, event, state.selection.from, files, {
              uploadFile,
              onFileUploadStart,
              onFileUploadStop,
              dictionary: this.options.dictionary,
              replaceExisting: true, // Replace the selected node
              nodeType: type,
            });
          }
        };
        inputElement.click();
        return true;
      },

      // Download command (same as attachment)
      downloadPdfAttachment: (): Command => (state) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const { node } = state.selection;

        const link = document.createElement("a");
        link.href = node.attrs.href;
        link.download = node.attrs.title || "document.pdf";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      },
    };
  }

  // Markdown serialization (represent as a link like attachments)
  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    // Include size in the link text for potential parsing later
    state.write(
      `[${node.attrs.title} pdf:${node.attrs.size}](${node.attrs.href})\n\n`
    );
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: this.name,
      getAttrs: (tok: Token) => {
        const text = tok.children?.[0]?.content || "";
        const sizeMatch = text.match(/pdf:(\d+)]?$/);
        const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
        const title = text.replace(/ pdf:\d+$/, "").trim();

        return {
          href: tok.attrGet("href"),
          title: title || "PDF Document",
          size,
        };
      },
    };
  }
}
