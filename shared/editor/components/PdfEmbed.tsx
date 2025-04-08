import { AttachmentIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { ComponentProps } from "../types"; // Assuming ComponentProps is needed and defined here or imported
import Widget from "./Widget"; // Assuming Widget is needed and defined here or imported

const PdfContainer = styled.div`
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  max-width: 100%;
  overflow: hidden; /* Keep overflow hidden for container */
  position: relative; /* For resize handle */
  display: flex; /* Use flexbox for layout */
  flex-direction: column; /* Stack widget header and iframe vertically */

  /* Basic resize handle styling */
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
    z-index: 1; /* Ensure handle is above iframe content */
  }
`;

// Keep LoadingMessage for the initial upload state
const LoadingMessage = styled.div`
  padding: 10px;
  color: ${(props) => props.theme.textSecondary};
`;

// Simplified state for iframe version
interface PdfComponentState {
  containerHeight: number; // Keep height state for resizing
  isResizing: boolean; // Track resizing state
  memoizedFile: { url: string } | null; // Keep track of the file URL
}

export default class PdfEmbedComponent extends React.Component<
  ComponentProps,
  PdfComponentState
> {
  // Initialize state
  state: PdfComponentState = {
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

  componentDidUpdate(prevProps: ComponentProps) {
    // Update memoizedFile only if href actually changes
    const currentHref = this.props.node.attrs.href;
    const previousHref = prevProps.node.attrs.href;

    if (currentHref !== previousHref) {
      this.setState({
        memoizedFile: currentHref ? { url: currentHref } : null,
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
    // Clean up resize listeners if component unmounts during resize
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  // --- Resizing Logic (Keep as is) ---

  handleResize = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation(); // Prevent node selection drag

    this.startDragY = event.clientY;
    this.startDragHeight = this.state.containerHeight;
    this.setState({ isResizing: true });

    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  };

  handleMouseMove = (event: MouseEvent): void => {
    if (!this.state.isResizing) {
      return;
    }

    const deltaY = event.clientY - this.startDragY;
    const newHeight = Math.max(100, this.startDragHeight + deltaY); // Min height 100px
    this.setState({ containerHeight: newHeight });
  };

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

  render() {
    const { node, isSelected, isEditable, theme } = this.props;
    const { title } = node.attrs;
    const { containerHeight, memoizedFile } = this.state;

    // Initial loading state before href is available
    if (!memoizedFile) {
      return (
        <Widget
          icon={<AttachmentIcon color={theme.textSecondary} />}
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
        {/* Render iframe for the PDF */}
        <div
          className="pdf-content-area" // Keep class for potential styling/selection
          style={{
            marginTop: "8px",
            flexGrow: 1,
            height: `${containerHeight}px`, // Apply dynamic height to wrapper
            position: "relative", // Needed for resize handle positioning
          }}
        >
          <iframe
            src={memoizedFile.url}
            style={{
              width: "100%",
              height: "100%", // Fill the container div
              border: "none", // Remove default iframe border
            }}
            title={title || "PDF Document"}
            // Consider adding sandbox attributes if needed for security
            // sandbox="allow-scripts allow-same-origin"
          />
          {/* Place resize handle within the content area or container */}
          {isEditable && (
            <div className="resize-handle" onMouseDown={this.handleResize} />
          )}
        </div>
        {/* Pagination controls removed */}
      </PdfContainer>
    );
  }
}
