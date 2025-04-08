import { AttachmentIcon } from "outline-icons"; // Changed from FileIcon
import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
// CSS imports are safe here as this component is only loaded client-side
// import 'react-pdf/dist/esm/entry.webpack.js'; // Removed incorrect import
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import styled from "styled-components";
import { ComponentProps } from "../types"; // Assuming ComponentProps is needed and defined here or imported
import Widget from "./Widget"; // Assuming Widget is needed and defined here or imported

// Configure pdfjs worker (can also be done here or globally)
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Memoize the options object outside the component
const pdfDocumentOptions = {
  workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
};

const PdfContainer = styled.div`
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  max-width: 100%;
  overflow: hidden; /* Restore overflow */
  /* min-height: 100px; */ /* Remove minimum height */
  position: relative; /* For potential resize handles */
  display: flex; /* Use flexbox for layout */
  flex-direction: column; /* Stack widget header and PDF vertically */

  .react-pdf__Document {
    flex-grow: 1; /* Allow PDF document to take available space */
    max-height: 500px; /* Limit initial height */
    overflow-y: auto;
    width: 100%; /* Ensure it takes full width */
    display: block; /* Ensure it's displayed */
    /* background: #eee; */ /* Remove temp background */
  }

  /* Basic resize handle styling (example) */
  .resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 15px;
    height: 15px;
    background: ${(props) => props.theme.textSecondary};
    cursor: nwse-resize;
    opacity: 0.5;
    border-top-left-radius: 4px;
  }
`;

const ErrorMessage = styled.div`
  color: ${(props) => props.theme.danger};
  padding: 10px;
`;

const LoadingMessage = styled.div`
  padding: 10px;
  color: ${(props) => props.theme.textSecondary};
`;

interface PdfComponentState {
  numPages: number | null;
  error: string | null;
  containerWidth: number;
  containerHeight: number; // Add height state
  isResizing: boolean; // Track resizing state
  memoizedFile: { url: string } | null;
}

// Renamed to avoid conflict if PdfComponent exists elsewhere
export default class PdfEmbedComponent extends React.Component<
  ComponentProps,
  PdfComponentState
> {
  // Initialize state including memoizedFile
  state: PdfComponentState = {
    numPages: null,
    error: null,
    containerWidth: 0,
    // Initialize height from node attribute if available, otherwise default
    containerHeight: this.props.node.attrs.height || 500,
    isResizing: false,
    memoizedFile: this.props.node.attrs.href
      ? { url: this.props.node.attrs.href }
      : null,
  };

  containerRef = React.createRef<HTMLDivElement>();
  startDragY = 0; // Store initial Y position for resizing
  startDragHeight = 0; // Store initial height for resizing

  componentDidMount() {
    this.updateContainerWidth();
    window.addEventListener("resize", this.updateContainerWidth);
  }

  componentDidUpdate(prevProps: ComponentProps) {
    // Update memoizedFile only if href actually changes
    const currentHref = this.props.node.attrs.href;
    const previousHref = prevProps.node.attrs.href;

    if (currentHref !== previousHref) {
      this.setState({
        memoizedFile: currentHref ? { url: currentHref } : null,
        // Reset numPages and error when file changes
        numPages: null,
        error: null,
      });
    }

    // Also update height if node attribute changes (e.g., external update)
    const currentHeight = this.props.node.attrs.height;
    const previousHeight = prevProps.node.attrs.height;
    if (currentHeight !== previousHeight && !this.state.isResizing) {
      this.setState({ containerHeight: currentHeight || 500 });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateContainerWidth);
    // Clean up resize listeners if component unmounts during resize
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  updateContainerWidth = () => {
    if (this.containerRef.current) {
      // Subtract padding/border width for accurate page width
      this.setState({
        containerWidth: this.containerRef.current.offsetWidth - 18,
      });
    }
  };

  onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    this.setState({ numPages, error: null });
  };

  onDocumentLoadError = (error: Error) => {
    this.setState({
      error: `Failed to load PDF: ${error.message}`,
      numPages: null,
    });
  };

  // --- Resizing Logic ---

  // Define as class property arrow function to bind 'this'
  handleResize = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation(); // Prevent node selection drag

    this.startDragY = event.clientY;
    this.startDragHeight = this.state.containerHeight;
    this.setState({ isResizing: true });

    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  };

  // Define as class property arrow function
  handleMouseMove = (event: MouseEvent): void => {
    if (!this.state.isResizing) {
      return;
    }

    const deltaY = event.clientY - this.startDragY;
    const newHeight = Math.max(100, this.startDragHeight + deltaY); // Min height 100px
    this.setState({ containerHeight: newHeight });
  };

  // Define as class property arrow function
  handleMouseUp = (): void => {
    if (!this.state.isResizing) {
      return;
    }

    this.setState({ isResizing: false });
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);

    // Persist the new height to the node attributes
    // This requires the 'height' attribute in the schema and updateAttributes prop
    if (this.props.updateAttributes) {
      this.props.updateAttributes({
        height: this.state.containerHeight,
      });
    }
    // Removed console.warn as updateAttributes is now expected to be present
  };

  // --- End Resizing Logic ---

  render() {
    const { node, isSelected, isEditable, theme } = this.props;
    const { title } = node.attrs;
    // Use containerHeight from state
    const { numPages, error, containerWidth, containerHeight, memoizedFile } =
      this.state;

    // Initial loading state before href is available (via memoizedFile)
    if (!memoizedFile) {
      return (
        <Widget
          icon={<AttachmentIcon color={theme.textSecondary} />} // Changed from FileIcon
          title={title || "Uploading PDF..."}
          isSelected={isSelected}
          theme={theme}
        >
          <LoadingMessage theme={theme}>Uploading…</LoadingMessage>
        </Widget>
      );
    }

    return (
      <PdfContainer
        ref={this.containerRef}
        theme={theme}
        data-nodetype="pdf_document"
        // Removed onClick handler - rely on ProseMirror/Widget for selection
      >
        {/* Render Widget for header only */}
        <Widget
          icon={<AttachmentIcon color={theme.textSecondary} />}
          title={title || "PDF Document"}
          // Make the widget itself non-interactive if needed, or keep selection logic
          isSelected={isSelected}
          theme={theme}
          // onClick={(e) => e.stopPropagation()} // Keep if needed for Widget interaction
        />
        {/* Render PDF Document outside the Widget, apply dynamic height */}
        <div
          className="pdf-content-area"
          style={{
            flexGrow: 1,
            overflowY: "auto",
            height: `${containerHeight}px`, // Apply dynamic height
            position: "relative", // Needed for resize handle positioning
          }}
        >
          {error ? (
            <ErrorMessage theme={theme}>{error}</ErrorMessage>
          ) : (
            <Document
              key={memoizedFile.url}
              file={memoizedFile}
              onLoadSuccess={this.onDocumentLoadSuccess}
              onLoadError={this.onDocumentLoadError}
              loading={
                <LoadingMessage theme={theme}>Loading PDF…</LoadingMessage>
              }
              options={pdfDocumentOptions}
            >
              {/* Render only the first page for large PDF handling */}
              {numPages !== null &&
                numPages > 0 && ( // Check numPages > 0
                  <Page
                    key={`page_1`}
                    pageNumber={1} // Always render page 1
                    width={containerWidth > 0 ? containerWidth : undefined}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                )}
              {/* Optionally indicate more pages exist */}
              {(numPages ?? 0) > 1 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "5px",
                    color: theme.textSecondary,
                    fontSize: "0.8em",
                  }}
                >
                  Page 1 of {numPages}
                </div>
              )}
            </Document>
          )}
          {/* Place resize handle within the content area or container */}
          {isEditable && (
            <div className="resize-handle" onMouseDown={this.handleResize} />
          )}
        </div>
      </PdfContainer>
    );
  }
}
