import { AttachmentIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { bytesToHumanReadable } from "../../utils/files";
import { ComponentProps } from "../types";
import Widget from "./Widget";

const PdfContainer = styled.div`
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  max-width: 100%;
  overflow: hidden;
  position: relative; /* For resize handle */
  display: flex;
  flex-direction: column;

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
    z-index: 1; /* Ensure handle is above iframe */
  }
`;

const LoadingMessage = styled.div`
  padding: 10px;
  color: ${(props) => props.theme.textSecondary};
`;

interface PdfComponentState {
  containerHeight: number;
  isResizing: boolean;
  memoizedFileUrl: string | null; // Store only the URL
}

interface PdfEmbedProps extends ComponentProps {
  onSelect: () => void;
}

export default class PdfEmbedComponent extends React.Component<
  PdfEmbedProps,
  PdfComponentState
> {
  state: PdfComponentState = {
    containerHeight: this.props.node.attrs.height || 500,
    isResizing: false,
    memoizedFileUrl: this.props.node.attrs.href || null,
  };

  containerRef = React.createRef<HTMLDivElement>();
  startDragY = 0;
  startDragHeight = 0;

  componentDidMount() {
    // No need to update container width for iframe typically
    window.addEventListener("resize", this.handleWindowResize); // Optional: Recalculate if needed
  }

  componentDidUpdate(prevProps: PdfEmbedProps, _prevState: PdfComponentState) {
    const currentHref = this.props.node.attrs.href;
    const previousHref = prevProps.node.attrs.href;

    if (currentHref !== previousHref) {
      this.setState({
        memoizedFileUrl: currentHref || null,
      });
    }

    const currentHeight = this.props.node.attrs.height;
    const previousHeight = prevProps.node.attrs.height;
    if (currentHeight !== previousHeight && !this.state.isResizing) {
      this.setState({ containerHeight: currentHeight || 500 });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  // Optional: Handle window resize if needed, e.g., for complex layouts
  handleWindowResize = () => {
    // Add logic here if the container size depends on window size
  };

  // --- Resizing Logic (Kept as it controls container height) ---
  handleResize = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

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

    if (this.props.updateAttributes) {
      this.props.updateAttributes({
        height: this.state.containerHeight,
      });
    }
  };
  // --- End Resizing Logic ---

  render() {
    const { node, isSelected, isEditable, theme, onSelect } = this.props;
    const { title } = node.attrs;
    const { containerHeight, memoizedFileUrl } = this.state;

    // Initial loading state if href is not yet available
    if (!memoizedFileUrl) {
      return (
        <Widget
          icon={<AttachmentIcon color={theme.textSecondary} />}
          title={title || "Uploading PDF..."}
          isSelected={isSelected}
          theme={theme}
          href={!isEditable ? node.attrs.href : undefined}
          onMouseDown={onSelect}
          onClick={(event) => {
            if (isEditable) {
              event.preventDefault();
              // Removed event.stopPropagation() to allow selection events to bubble up
            }
          }}
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
      >
        <Widget
          icon={<AttachmentIcon color={theme.textSecondary} />}
          title={title || "PDF Document"}
          context={bytesToHumanReadable(node.attrs.size || 0)}
          isSelected={isSelected}
          theme={theme}
          href={memoizedFileUrl} // Always set href to enable hover + pointer
          onMouseDown={onSelect}
          onClick={(event) => {
            if (isEditable) {
              event.preventDefault();
              // Removed event.stopPropagation() to allow selection events to bubble up
            }
          }}
        />
        {/* Iframe Container */}
        <div
          className="pdf-content-area"
          style={{
            marginTop: "8px",
            flexGrow: 1,
            height: `${containerHeight}px`, // Apply dynamic height from state
            position: "relative", // Needed for resize handle positioning
            overflow: "hidden", // Hide potential iframe scrollbars if container handles it
          }}
        >
          <iframe
            src={memoizedFileUrl}
            width="100%"
            height="100%"
            style={{ border: "none" }} // Remove default iframe border
            title={title || "PDF Document"}
            // Consider adding sandbox attributes for security if PDFs are from untrusted sources
            // sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
          {/* Resize Handle */}
          {isEditable && (
            <div className="resize-handle" onMouseDown={this.handleResize} />
          )}
        </div>
      </PdfContainer>
    );
  }
}
