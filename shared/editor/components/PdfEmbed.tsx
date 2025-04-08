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
  position: relative; /* For potential resize handles */
  display: flex; /* Use flexbox for layout */
  flex-direction: column; /* Stack widget header and PDF vertically */

  .react-pdf__Document {
    flex-grow: 1; /* Allow PDF document to take available space */
    overflow-y: auto;
    width: 100%; /* Ensure it takes full width */
    display: block; /* Ensure it's displayed */
  }

  .pdf-page {
    margin-bottom: 8px; /* Add spacing between pages */
    display: flex; /* Center page horizontally */
    justify-content: center;
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
    z-index: 1; /* Ensure handle is above PDF content */
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

// Styled components for Pagination
const PaginationControls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 0; /* Add padding above controls */
  border-top: 1px solid ${(props) => props.theme.divider};
  margin-top: 8px;
`;

const PaginationButton = styled.button`
  background: none;
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 4px;
  padding: 4px 8px;
  margin: 0 4px;
  color: ${(props) => props.theme.text};
  cursor: pointer;

  &:disabled {
    color: ${(props) => props.theme.textSecondary};
    cursor: default;
    opacity: 0.5;
  }

  &:not(:disabled):hover {
    background: ${(props) => props.theme.buttonNeutralBackground};
  }
`;

const PageIndicator = styled.span`
  margin: 0 8px;
  color: ${(props) => props.theme.textSecondary};
  font-size: 0.9em;
`;

interface PdfComponentState {
  numPages: number | null;
  error: string | null;
  containerWidth: number;
  containerHeight: number; // Add height state
  isResizing: boolean; // Track resizing state
  memoizedFile: { url: string } | null;
  currentPage: number; // Add state for current page
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
    currentPage: 1, // Initialize current page
  };

  containerRef = React.createRef<HTMLDivElement>();
  startDragY = 0; // Store initial Y position for resizing
  startDragHeight = 0; // Store initial height for resizing

  componentDidMount() {
    this.updateContainerWidth();
    window.addEventListener("resize", this.updateContainerWidth);
  }

  componentDidUpdate(prevProps: ComponentProps, prevState: PdfComponentState) {
    // Update memoizedFile only if href actually changes
    const currentHref = this.props.node.attrs.href;
    const previousHref = prevProps.node.attrs.href;

    if (currentHref !== previousHref) {
      this.setState({
        memoizedFile: currentHref ? { url: currentHref } : null,
        // Reset numPages, error, and current page when file changes
        numPages: null,
        error: null,
        currentPage: 1,
      });
    }

    // Also update height if node attribute changes (e.g., external update)
    const currentHeight = this.props.node.attrs.height;
    const previousHeight = prevProps.node.attrs.height;
    if (currentHeight !== previousHeight && !this.state.isResizing) {
      this.setState({ containerHeight: currentHeight || 500 });
    }

    // Recalculate container width if height changes (might affect scrollbars)
    if (prevState.containerHeight !== this.state.containerHeight) {
      this.updateContainerWidth();
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateContainerWidth);
    // Clean up resize listeners if component unmounts during resize
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  updateContainerWidth = () => {
    // Debounce or throttle this if it causes performance issues on resize
    if (this.containerRef.current) {
      // Use offsetWidth of the content area for page width calculation
      const contentArea =
        this.containerRef.current.querySelector<HTMLDivElement>(
          ".pdf-content-area"
        );
      if (contentArea) {
        this.setState({
          containerWidth: contentArea.offsetWidth,
        });
      }
    }
  };

  onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    this.setState({ numPages, error: null, currentPage: 1 }); // Reset to page 1 on new load
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
    if (this.props.updateAttributes) {
      this.props.updateAttributes({
        height: this.state.containerHeight,
      });
    }
  };
  // --- End Resizing Logic ---

  // --- Pagination Logic ---
  goToPrevPage = () =>
    this.setState((state) => ({
      currentPage: Math.max(1, state.currentPage - 1),
    }));

  goToNextPage = () =>
    this.setState((state) => ({
      currentPage: Math.min(state.numPages || 1, state.currentPage + 1),
    }));
  // --- End Pagination Logic ---

  render() {
    const { node, isSelected, isEditable, theme } = this.props;
    const { title } = node.attrs;
    // Use containerHeight and currentPage from state
    const {
      numPages,
      error,
      containerWidth,
      containerHeight,
      memoizedFile,
      currentPage,
    } = this.state;

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
          isSelected={isSelected}
          theme={theme}
        />
        {/* Render PDF Document outside the Widget, apply dynamic height */}
        <div
          className="pdf-content-area"
          style={{
            marginTop: "8px", // Add margin/padding below the header
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
              {/* Render only the current page */}
              {numPages !== null && currentPage > 0 && (
                <Page
                  key={`page_${currentPage}`}
                  pageNumber={currentPage}
                  width={containerWidth > 0 ? containerWidth : undefined}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  className="pdf-page"
                />
              )}
            </Document>
          )}
          {/* Place resize handle within the content area or container */}
          {isEditable && (
            <div className="resize-handle" onMouseDown={this.handleResize} />
          )}
        </div>
        {/* Pagination Controls - Placed outside the scrolling content area */}
        {numPages !== null && numPages > 1 && (
          <PaginationControls>
            <PaginationButton
              onClick={this.goToPrevPage}
              disabled={currentPage <= 1}
            >
              {"< Prev"} {/* Wrap in {} as string literal */}
            </PaginationButton>
            <PageIndicator>
              Page {currentPage} of {numPages}
            </PageIndicator>
            <PaginationButton
              onClick={this.goToNextPage}
              disabled={currentPage >= numPages}
            >
              {"Next >"} {/* Wrap in {} as string literal */}
            </PaginationButton>
          </PaginationControls>
        )}
      </PdfContainer>
    );
  }
}
