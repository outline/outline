import { AttachmentIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { bytesToHumanReadable } from "../../utils/files";
import { ComponentProps } from "../types";
import Widget from "./Widget";

const PdfContainer = styled.div`
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 4px;
  padding: 6px;
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
    memoizedFileUrl: this.props.node.attrs.href || null,
  };

  isResizing = false;

  containerRef = React.createRef<HTMLDivElement>();
  startDragY = 0;
  startDragHeight = 0;

  componentDidMount() {
    // No need to update container width for iframe typically
    // window.addEventListener("resize", this.handleWindowResize); // Removed unused listener
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
    if (currentHeight !== previousHeight && !this.isResizing) {
      this.setState({ containerHeight: currentHeight || 500 });
    }
  }

  componentWillUnmount() {
    // window.removeEventListener("resize", this.handleWindowResize); // Removed unused listener
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  // // Handle window resize if needed, e.g., for complex layouts - Removed as unused
  // handleWindowResize = () => {
  // };

  // --- Resizing Logic
  handleResize = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    this.startDragY = event.clientY;
    this.startDragHeight = this.state.containerHeight;
    this.isResizing = true;

    // Create overlay to capture all mouse events
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.zIndex = "9999";
    overlay.style.cursor = "nwse-resize";
    overlay.style.background = "transparent";
    overlay.id = "pdf-resize-overlay";
    document.body.appendChild(overlay);

    window.addEventListener("mousemove", this.handleMouseMove, true);
    window.addEventListener("mouseup", this.handleMouseUp, true);
  };

  handleMouseMove = (event: MouseEvent): void => {
    if (!this.isResizing) {
      return;
    }

    const deltaY = event.clientY - this.startDragY;
    const newHeight = Math.max(100, this.startDragHeight + deltaY); // Min height 100px

    // Directly update container height style for smooth resize without React re-render
    if (this.containerRef.current) {
      this.containerRef.current.querySelector<HTMLElement>(
        ".pdf-content-area"
      )!.style.height = `${newHeight}px`;
    }
  };

  handleMouseUp = (): void => {
    if (!this.isResizing) {
      return;
    }

    window.removeEventListener("mousemove", this.handleMouseMove, true);
    window.removeEventListener("mouseup", this.handleMouseUp, true);

    // Remove overlay
    const overlay = document.getElementById("pdf-resize-overlay");
    if (overlay) {
      overlay.remove();
    }

    // Read the final height from the DOM
    let finalHeight = this.state.containerHeight;
    if (this.containerRef.current) {
      const contentArea =
        this.containerRef.current.querySelector<HTMLElement>(
          ".pdf-content-area"
        );
      if (contentArea) {
        const heightStr = contentArea.style.height.replace("px", "");
        const parsed = parseInt(heightStr, 10);
        if (!isNaN(parsed)) {
          finalHeight = parsed;
        }
      }
    }

    this.isResizing = false;
    this.setState({ containerHeight: finalHeight });

    if (this.props.updateAttributes) {
      this.props.updateAttributes({
        height: finalHeight,
      });
    }
  };

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
            event.preventDefault(); // Always prevent default navigation on single click
          }}
          onDoubleClick={() => {
            window.open(memoizedFileUrl || "", "_blank");
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
            // Added sandbox for basic security. Adjust as needed based on trust level of PDF sources.
            sandbox="allow-same-origin"
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
