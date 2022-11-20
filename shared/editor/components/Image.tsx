import { DownloadIcon } from "outline-icons";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import ImageZoom, { ImageZoom_Image } from "react-medium-image-zoom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { sanitizeUrl } from "@shared/utils/urls";
import { ComponentProps } from "../types";

type DragDirection = "left" | "right";

const Image = (
  props: ComponentProps & {
    dictionary: any;
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onDownload: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onChangeSize: (props: { width: number; height?: number }) => void;
    onCaptionKeyDown: (
      event: React.KeyboardEvent<HTMLParagraphElement>
    ) => void;
    onCaptionBlur: (event: React.FocusEvent<HTMLParagraphElement>) => void;
    onCaptionMouseDown: (event: React.MouseEvent<HTMLParagraphElement>) => void;
    view: EditorView;
  }
) => {
  const { dictionary, theme, isSelected, node, isEditable } = props;
  const { alt, src, layoutClass } = node.attrs;
  const className = layoutClass ? `image image-${layoutClass}` : "image";
  const [naturalWidth, setNaturalWidth] = React.useState(node.attrs.width);
  const [naturalHeight, setNaturalHeight] = React.useState(node.attrs.height);
  const [size, setSize] = React.useState({
    width: node.attrs.width ?? naturalWidth,
    height: node.attrs.height ?? naturalHeight,
  });
  const [sizeAtDragStart, setSizeAtDragStart] = React.useState(size);
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState<DragDirection>();
  const documentWidth = props.view?.dom.clientWidth;
  const maxWidth = layoutClass ? documentWidth / 3 : documentWidth;

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
    props.onChangeSize(size);

    document.removeEventListener("mousemove", handlePointerMove);
  };

  const handlePointerDown = (dragging: "left" | "right") => (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
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
  }, [dragging, handlePointerMove, handlePointerUp]);

  const style = { width: size.width || "auto" };

  return (
    <div contentEditable={false} className={className}>
      <ImageWrapper
        className={isSelected || dragging ? "ProseMirror-selectednode" : ""}
        onClick={dragging ? undefined : props.onClick}
        style={style}
      >
        {!dragging && size.width > 60 && size.height > 60 && (
          <Button onClick={props.onDownload}>
            <DownloadIcon color="currentColor" />
          </Button>
        )}
        <ImageZoom
          image={
            {
              style,
              src: sanitizeUrl(src) ?? "",
              alt,
              onLoad: (ev: React.SyntheticEvent<HTMLImageElement>) => {
                // For some SVG's Firefox does not provide the naturalWidth, in this
                // rare case we need to provide a default so that the image can be
                // seen and is not sized to 0px
                const nw = (ev.target as HTMLImageElement).naturalWidth || 300;
                const nh = (ev.target as HTMLImageElement).naturalHeight;
                setNaturalWidth(nw);
                setNaturalHeight(nh);

                if (!node.attrs.width) {
                  setSize((state) => ({
                    ...state,
                    width: nw,
                  }));
                }
              },
            } as ImageZoom_Image
          }
          defaultStyles={{
            overlay: {
              backgroundColor: theme.background,
            },
          }}
          shouldRespectMaxDimension
        />
        {isEditable && (
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
      <Caption
        onKeyDown={props.onCaptionKeyDown}
        onBlur={props.onCaptionBlur}
        onMouseDown={props.onCaptionMouseDown}
        className="caption"
        tabIndex={-1}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        data-caption={dictionary.imageCaptionPlaceholder}
      >
        {props.node.attrs.alt}
      </Caption>
    </div>
  );
};

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
    background: ${(props) => props.theme.toolbarBackground};
    box-shadow: 0 0 0 1px ${(props) => props.theme.toolbarItem};
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

const Caption = styled.p`
  border: 0;
  display: block;
  font-style: italic;
  font-weight: normal;
  color: ${(props) => props.theme.textSecondary};
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
    color: ${(props) => props.theme.placeholder};
    content: attr(data-caption);
    pointer-events: none;
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
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.textSecondary};
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
    color: ${(props) => props.theme.text};
    opacity: 1;
  }
`;

const ImageWrapper = styled.div`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
  transition-property: width, height;
  transition-duration: 150ms;
  transition-timing-function: ease-in-out;
  touch-action: none;

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
