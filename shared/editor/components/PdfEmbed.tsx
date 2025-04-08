limport { FileIcon } from "outline-icons";
import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
// CSS imports are safe here as this component is only loaded client-side
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import styled, { css } from "styled-components"; // Add css import
import { ComponentProps } from "../types"; // Assuming ComponentProps is needed and defined here or imported
// Remove Widget import
import { s } from "@shared/styles"; // Need 's' for inlined styles
import { sanitizeUrl } from "@shared/utils/urls"; // Need sanitizeUrl for inlined styles

// Configure pdfjs worker (can also be done here or globally)
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PdfContainer = styled.div`
  border: 1px solid ${props => props.theme.divider};
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  max-width: 100%;
  overflow: hidden; /* Hide overflow initially */
  position: relative; /* For potential resize handles */
c
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

// --- Inlined Widget Styles & Components ---
const Children = styled.div`
  margin-left: auto;
  height: 20px;
  opacity: 0;

  &:hover {
    color: ${s("text")};
  }
`;

const Title = styled.strong`
  font-weight: 500;
  font-size: 14px;
  color: ${s("text")};
`;

const Preview = styled.div`
  gap: 8px;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  align-items: center;
  color: ${s("textTertiary")};
`;

const Subtitle = styled.span`
  font-size: 13px;
  color: ${s("textTertiary")} !important;
  line-height: 0;
`;

// Base styles for both div and link versions
const wrapperStyles = css`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${s("background")};
  color: ${s("text")} !important; /* Use important carefully */
  box-shadow: 0 0 0 1px ${s("divider")};
  white-space: nowrap;
  border-radius: 8px;
  padding: 6px 8px;
  max-width: 840px;
  cursor: default;

  user-select: none;
  text-overflow: ellipsis;
  overflow: hidden;
`;

// Component rendered as a div (when no href)
const WrapperDiv = styled.div`
  ${wrapperStyles}
`;

// Component rendered as a link (when href is present)
const WrapperLink = styled.a`
  ${wrapperStyles}

  &:hover,
  &:active {
    cursor: pointer !important; /* Use important carefully */
    text-decoration: none !important; /* Use important carefully */
    background: ${s("backgroundSecondary")};

    ${Children} {
      opacity: 1;
    }
  }
`;
// --- End Inlined Widget Styles & Components ---


interface PdfComponentState {
  numPages: number | null;
  error: string | null;
  containerWidth: number;
}

// Use named export again, as required for lazy loading separation
export class PdfEmbedComponent extends React.Component<ComponentProps, PdfComponentState> {
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
      // Subtract padding/border width for accurate page width
      this.setState({ containerWidth: this.containerRef.current.offsetWidth - 18 });
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
    event.preventDefault(); // Prevent default drag behavior if any
  };

  render() {
    // *** RESTORED ORIGINAL RENDER LOGIC (using inlined Widget structure) ***
    const { node, isSelected, isEditable, theme } = this.props;
    const { href, title } = node.attrs;
    const { numPages, error, containerWidth } = this.state;

    const widgetClassName = isSelected ? "ProseMirror-selectednode widget" : "widget";
    const icon = <FileIcon color={theme.textSecondary} />; // Restore icon

    if (!href) {
      // Render placeholder using WrapperDiv
      return (
        <WrapperDiv className={widgetClassName}>
          {icon}
          <Preview>
            <Title>{title || "Uploading PDF..."}</Title>
            <Subtitle /> {/* No context */}
            <Children>
              <LoadingMessage theme={theme}>Uploading…</LoadingMessage>
            </Children>
          </Preview>
        </WrapperDiv>
      );
    }

    // Render PDF embed using WrapperLink (or WrapperDiv if needed, but href exists here)
    return (
      <PdfContainer ref={this.containerRef} theme={theme} data-nodetype="pdf_document">
        <WrapperLink
          className={widgetClassName}
          href={sanitizeUrl(href)} // Use href for link
          target="_blank"
          rel="noreferrer nofollow"
          onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent node deselection
        >
          {icon}
          <Preview>
            <Title>{title || "PDF Document"}</Title>
            <Subtitle /> {/* No context */}
            <Children> {/* Children area for potential future use */} </Children>
          </Preview>
        </WrapperLink>

        {/* PDF Document rendering logic remains below the inlined widget */}
        {error ? (
          <ErrorMessage theme={theme}>{error}</ErrorMessage>
        ) : (
          <Document
            file={href}
            onLoadSuccess={this.onDocumentLoadSuccess}
            onLoadError={this.onDocumentLoadError}
            loading={<LoadingMessage theme={theme}>Loading PDF…</LoadingMessage>}
            options={{ workerSrc: pdfjs.GlobalWorkerOptions.workerSrc }}
          >
            {Array.from(new Array(numPages ?? 0), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={containerWidth > 0 ? containerWidth : undefined}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            ))}
          </Document>
        )}
        {/* Example resize handle - needs proper event handling */}
        {isEditable && <div className="resize-handle" onMouseDown={this.handleResize} />}
      </PdfContainer>
    );
  }
}
