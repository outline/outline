import { Token } from "markdown-it";
import { FileIcon } from "outline-icons"; // Using a generic file icon for now
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Command, NodeSelection } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import styled from "styled-components";
import { bytesToHumanReadable, getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import insertFiles from "../commands/insertFiles";
import toggleWrap from "../commands/toggleWrap";
import Widget from "../components/Widget"; // Reusing Widget for consistency
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/links"; // Reusing attachment rule for parsing links
import { ComponentProps } from "../types";
import Node from "./Node";

// Configure pdfjs worker
// Use a CDN for the worker source for simplicity in this example.
// In a real app, you'd likely want to host this worker file yourself.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PdfContainer = styled.div`
  border: 1px solid ${props => props.theme.divider};
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  max-width: 100%;
  overflow: hidden; /* Hide overflow initially */
  position: relative; /* For potential resize handles */

  .react-pdf__Document {
    max-height: 500px; /* Limit initial height */
    overflow-y: auto;
  }

  /* Basic resize handle styling (example) */
  .resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 15px;
    height: 15px;
    background: ${props => props.theme.textSecondary};
    cursor: nwse-resize;
    opacity: 0.5;
    border-top-left-radius: 4px;
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.danger};
  padding: 10px;
`;

const LoadingMessage = styled.div`
  padding: 10px;
  color: ${props => props.theme.textSecondary};
`;

interface PdfComponentState {
  numPages: number | null;
  error: string | null;
  containerWidth: number;
}

class PdfComponent extends React.Component<ComponentProps, PdfComponentState> {
  state: PdfComponentState = {
    numPages: null,
    error: null,
    containerWidth: 0,
  };

  containerRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.updateContainerWidth();
    window.addEventListener('resize', this.updateContainerWidth);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateContainerWidth);
  }

  updateContainerWidth = () => {
    if (this.containerRef.current) {
      this.setState({ containerWidth: this.containerRef.current.offsetWidth - 16 }); // Adjust for padding
    }
  };

  onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    this.setState({ numPages, error: null });
  };

  onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    this.setState({ error: `Failed to load PDF: ${error.message}`, numPages: null });
  };

  // Basic resize logic (could be improved with drag events)
  handleResize = (event: React.MouseEvent) => {
    // Placeholder for more complex resize handling
    console.log("Resize handle clicked", event);
  };

  render() {
    const { node, isSelected, isEditable, theme } = this.props;
    const { href, title } = node.attrs;
    const { numPages, error, containerWidth } = this.state;

    if (!href) {
      return (
        <Widget
          icon={<FileIcon color={theme.textSecondary} />}
          title={title || "Uploading PDF..."}
          isSelected={isSelected}
          theme={theme}
        >
          <LoadingMessage>Uploading…</LoadingMessage>
        </Widget>
      );
    }

    return (
      <PdfContainer ref={this.containerRef} theme={theme} data-nodetype="pdf_document">
        <Widget
          icon={<FileIcon color={theme.textSecondary} />}
          title={title || "PDF Document"}
          isSelected={isSelected}
          theme={theme}
          // Prevent clicks inside the widget from deselecting the node
          onClick={(e) => e.stopPropagation()}
        >
          {error ? (
            <ErrorMessage theme={theme}>{error}</ErrorMessage>
          ) : (
            <Document
              file={href}
              onLoadSuccess={this.onDocumentLoadSuccess}
              onLoadError={this.onDocumentLoadError}
              loading={<LoadingMessage theme={theme}>Loading PDF…</LoadingMessage>}
            >
              {Array.from(new Array(numPages), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={containerWidth > 0 ? containerWidth : undefined} // Use container width
                  renderAnnotationLayer={false} // Disable annotation layer for simplicity
                  renderTextLayer={false} // Disable text layer for simplicity
                />
              ))}
            </Document>
          )}
          {/* Example resize handle - needs proper event handling */}
          {isEditable && <div className="resize-handle" onMouseDown={this.handleResize} />}
        </Widget>
      </PdfContainer>
    );
  }
}


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
        id: { // Keep ID for potential future use
          default: null,
        },
        href: { // URL of the uploaded PDF
          default: null,
        },
        title: { // Original filename
          default: "PDF Document",
        },
        size: { // File size
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

  // Use the new PdfComponent for rendering
  component = (props: ComponentProps) => {
    // Need to pass theme explicitly if PdfComponent isn't wrapped by theme provider
    return <PdfComponent {...props} theme={this.editor.props.theme} />;
  };

  // Commands adapted from Attachment
  commands({ type }: { type: NodeType }) {
    return {
      createPdfAttachment: (attrs: Record<string, Primitive>) =>
        toggleWrap(type, attrs), // Use toggleWrap to insert the node

      // Command to trigger file upload and insertion
      uploadPdfPlaceholder: (): Command => (state, dispatch) => {
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
      deletePdfAttachment: (): Command => (state, dispatch) => {
        dispatch?.(state.tr.deleteSelection());
        return true;
      },

      // Replace command (similar to attachment, but for PDFs)
      replacePdfAttachment: (): Command => (state) => {
        if (!(state.selection instanceof NodeSelection)) return false;

        const { view } = this.editor;
        const { node } = state.selection;
        const { uploadFile, onFileUploadStart, onFileUploadStop } = this.editor.props;

        if (!uploadFile) throw new Error("uploadFile prop is required");
        if (node.type.name !== this.name) return false;

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
        if (!(state.selection instanceof NodeSelection)) return false;
        const { node } = state.selection;

        const link = document.createElement("a");
        link.href = node.attrs.href;
        link.download = node.attrs.title || 'document.pdf'; // Add download attribute
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
          size: size,
        };
      },
      // Ensure this rule runs before the generic link rule if priorities clash
    };
  }
}
