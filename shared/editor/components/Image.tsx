import { DownloadIcon } from "outline-icons";
import type { EditorView } from "prosemirror-view";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "../../styles";
import { sanitizeUrl } from "../../utils/urls";
import { ComponentProps } from "../types";
import ImageZoom from "./ImageZoom";

type DragDirection = "left" | "right";

const Image = (
  props: ComponentProps & {
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onDownload?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onChangeSize?: (props: { width: number; height?: number }) => void;
    children?: React.ReactElement;
    view: EditorView;
  }
) => {
  const { isSelected, node, isEditable } = props;
  const { src, layoutClass } = node.attrs;
  const className = layoutClass ? `image image-${layoutClass}` : "image";
  const [contentWidth, setContentWidth] = React.useState(
    () => document.body.querySelector("#full-width-container")?.clientWidth || 0
  );
  const [loaded, setLoaded] = React.useState(false);
  const [naturalWidth, setNaturalWidth] = React.useState(node.attrs.width);
  const [naturalHeight, setNaturalHeight] = React.useState(node.attrs.height);
  const [size, setSize] = React.useState({
    width: node.attrs.width ?? naturalWidth,
    height: node.attrs.height ?? naturalHeight,
  });
  const [sizeAtDragStart, setSizeAtDragStart] = React.useState(size);
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState<DragDirection>();
  const [documentWidth, setDocumentWidth] = React.useState(
    props.view ? getInnerWidth(props.view.dom) : 0
  );
  const maxWidth = layoutClass ? documentWidth / 3 : documentWidth;
  const isFullWidth = layoutClass === "full-width";
  const isResizable = !!props.onChangeSize;

  React.useLayoutEffect(() => {
    if (!isResizable) {
      return;
    }

    const handleResize = () => {
      const contentWidth =
        document.body.querySelector("#full-width-container")?.clientWidth || 0;
      setContentWidth(contentWidth);
      setDocumentWidth(props.view ? getInnerWidth(props.view.dom) : 0);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [props.view, isResizable]);

  const constrainWidth = (width: number) => {
    const minWidth = documentWidth * 0.1;
    return Math.round(Math.min(maxWidth, Math.max(width, minWidth)));
  };

  const handlePointerMove = (event: PointerEvent) => {
    event.preventDefault();

    let diff;
    if (dragging === "left") {
      diff = offset - event.pageX;
    } else {
      diff = event.pageX - offset;
    }

    const grid = documentWidth / 10;
    const newWidth = sizeAtDragStart.width + diff * 2;
    const widthOnGrid = Math.round(newWidth / grid) * grid;
    const constrainedWidth = constrainWidth(widthOnGrid);

    const aspectRatio = naturalHeight / naturalWidth;
    setSize({
      width: constrainedWidth,
      height: naturalWidth
        ? Math.round(constrainedWidth * aspectRatio)
        : undefined,
    });
  };

  const handlePointerUp = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setOffset(0);
    setDragging(undefined);
    props.onChangeSize?.(size);

    document.removeEventListener("mousemove", handlePointerMove);
  };

  const handlePointerDown =
    (dragging: "left" | "right") =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setSizeAtDragStart({
        width: constrainWidth(size.width),
        height: size.height,
      });
      setOffset(event.pageX);
      setDragging(dragging);
    };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      setSize(sizeAtDragStart);
      setDragging(undefined);
    }
  };

  React.useEffect(() => {
    if (node.attrs.width && node.attrs.width !== size.width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.width]);

  React.useEffect(() => {
    if (!isResizable) {
      return;
    }

    if (dragging) {
      document.body.style.cursor = "ew-resize";
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      document.body.style.cursor = "initial";
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp, isResizable]);

  const widthStyle = isFullWidth
    ? { width: contentWidth }
    : { width: size.width || "auto" };

  const containerStyle = isFullWidth
    ? ({
        "--offset": `${-(contentWidth - documentWidth) / 2}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div contentEditable={false} className={className} style={containerStyle}>
      <ImageWrapper
        isFullWidth={isFullWidth}
        className={isSelected || dragging ? "ProseMirror-selectednode" : ""}
        onClick={dragging ? undefined : props.onClick}
        style={widthStyle}
      >
        {!dragging &&
          size.width > 60 &&
          size.height > 60 &&
          props.onDownload && (
            <Button onClick={props.onDownload}>
              <DownloadIcon />
            </Button>
          )}
        <ImageZoom zoomMargin={24}>
          <img
            style={{
              ...widthStyle,
              display: loaded ? "block" : "none",
            }}
            src={sanitizeUrl(src) ?? ""}
            onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
              // For some SVG's Firefox does not provide the naturalWidth, in this
              // rare case we need to provide a default so that the image can be
              // seen and is not sized to 0px
              const nw = (ev.target as HTMLImageElement).naturalWidth || 300;
              const nh = (ev.target as HTMLImageElement).naturalHeight;
              setNaturalWidth(nw);
              setNaturalHeight(nh);
              setLoaded(true);

              if (!node.attrs.width) {
                setSize((state) => ({
                  ...state,
                  width: nw,
                }));
              }
            }}
          />
          {!loaded && size.width && size.height && (
            <img
              style={{
                ...widthStyle,
                display: "block",
              }}
              src={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                getPlaceholder(size.width, size.height)
              )}`}
            />
          )}
        </ImageZoom>
        {isEditable && !isFullWidth && isResizable && (
          <>
            <ResizeLeft
              onPointerDown={handlePointerDown("left")}
              $dragging={!!dragging}
            />
            <ResizeRight
              onPointerDown={handlePointerDown("right")}
              $dragging={!!dragging}
            />
          </>
        )}
      </ImageWrapper>
      {isFullWidth && props.children
        ? React.cloneElement(props.children, { style: widthStyle })
        : props.children}
    </div>
  );
};

function getInnerWidth(element: Element) {
  const computedStyle = window.getComputedStyle(element, null);
  let width = element.clientWidth;
  width -=
    parseFloat(computedStyle.paddingLeft) +
    parseFloat(computedStyle.paddingRight);

  return width;
}

function getPlaceholder(width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" />`;
}

export const Caption = styled.p`
  border: 0;
  display: block;
  font-style: italic;
  font-weight: normal;
  color: ${s("textSecondary")};
  padding: 8px 0 4px;
  line-height: 16px;
  text-align: center;
  min-height: 1em;
  outline: none;
  background: none;
  resize: none;
  user-select: text;
  margin: 0 !important;
  cursor: text;

  ${breakpoint("tablet")`
    font-size: 13px;
  `};

  &:empty:not(:focus) {
    display: none;
  }

  &:empty:before {
    color: ${s("placeholder")};
    content: attr(data-caption);
    pointer-events: none;
  }
`;

const ResizeLeft = styled.div<{ $dragging: boolean }>`
  cursor: ew-resize;
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  user-select: none;
  opacity: ${(props) => (props.$dragging ? 1 : 0)};
  transition: opacity 150ms ease-in-out;

  &:after {
    content: "";
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 15%;
    min-height: 20px;
    border-radius: 4px;
    background: ${s("menuBackground")};
    box-shadow: 0 0 0 1px ${s("textSecondary")};
    opacity: 0.75;
  }
`;

const ResizeRight = styled(ResizeLeft)`
  left: initial;
  right: -4px;

  &:after {
    left: initial;
    right: 8px;
  }
`;

const Button = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  border: 0;
  margin: 0;
  padding: 0;
  border-radius: 4px;
  background: ${s("background")};
  color: ${s("textSecondary")};
  width: 24px;
  height: 24px;
  display: inline-block;
  cursor: var(--pointer);
  opacity: 0;
  transition: opacity 150ms ease-in-out;

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    color: ${s("text")};
    opacity: 1;
  }
`;

const ImageWrapper = styled.div<{ isFullWidth: boolean }>`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: ${(props) => (props.isFullWidth ? "initial" : "100%")};
  transition-property: width, height;
  transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
  transition-timing-function: ease-in-out;
  overflow: hidden;

  img {
    transition-property: width, height;
    transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
    transition-timing-function: ease-in-out;
  }

  &:hover {
    ${Button} {
      opacity: 0.9;
    }

    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }

  &.ProseMirror-selectednode + ${Caption} {
    display: block;
  }
`;

export default Image;
