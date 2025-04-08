import { Token } from "markdown-it";
// import { FileIcon } from "outline-icons"; // Removed unused import
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Command, NodeSelection } from "prosemirror-state";
import * as React from "react";
import { lazy, Suspense } from "react";
import { pdfjs } from "react-pdf"; // Keep pdfjs import for worker config if needed globally
import { Primitive } from "utility-types";
import { getEventFiles } from "../../utils/files"; // Removed unused bytesToHumanReadable
import { sanitizeUrl } from "../../utils/urls";
import insertFiles from "../commands/insertFiles";
import toggleWrap from "../commands/toggleWrap";
// Import Widget directly if needed for fallback, otherwise remove
// import Widget from "../components/Widget";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/links"; // Reusing attachment rule for parsing links
import { ComponentProps } from "../types";
import Node from "./Node";

// Lazy load the component that contains react-pdf and CSS imports
const PdfEmbedComponent = lazy(() => import("../components/PdfEmbed"));

// Configure pdfjs worker to use the locally copied file
pdfjs.GlobalWorkerOptions.workerSrc = `/static/assets/pdf.worker.min.js`;

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
        // Add width/height attributes if needed for persistence
        // width: { default: '100%' },
        // height: { default: '500px' },
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
        // Add a rule to parse the rendered structure if needed
        // {
        //   tag: `div[data-nodetype="${this.name}"]`,
        //   getAttrs: (dom: HTMLElement) => ({ ... })
        // }
      ],
      toDOM: (node) => [
        // Represent as a link in the raw DOM for simplicity/fallback
        // The React component handles the actual rendering
        "a",
        {
          class: `pdf-attachment`, // Specific class
          id: node.attrs.id,
          href: sanitizeUrl(node.attrs.href),
          "data-title": node.attrs.title,
          "data-size": node.attrs.size,
          // Add width/height data attributes if needed
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

  // Use the lazy-loaded component wrapped in Suspense
  component = (props: ComponentProps) => (
    // Pass props to PdfEmbedComponent, but use the simplified fallback
    <Suspense fallback={<PdfLoadingFallback />}>
      <PdfEmbedComponent {...props} />
    </Suspense>
  );

  // Commands adapted from Attachment (no changes needed here)
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
        inputElement.accept = ".pdf"; // Accept only PDF files
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

        // We don't dispatch a transaction immediately, insertFiles handles it
        return true;
      },

      // Delete command (same as attachment)
      // Rename dispatch to _dispatch to satisfy eslint rule for potentially unused arguments
      deletePdfAttachment: (): Command => (state, _dispatch) => {
        _dispatch?.(state.tr.deleteSelection());
        return true;
      },

      // Replace command (similar to attachment, but for PDFs)
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
        link.download = node.attrs.title || "document.pdf"; // Add download attribute
        link.target = "_blank"; // Open in new tab might be better than forcing download
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

  // Markdown parsing (look for the specific link text format)
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
      // Ensure this rule runs before the generic link rule if priorities clash
    };
  }
}
