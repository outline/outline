import { CrossIcon, DownloadIcon, GlobeIcon, ZoomInIcon } from "outline-icons";
import type { EditorView } from "prosemirror-view";
import * as React from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import find from "lodash/find";
import Flex from "../../components/Flex";
import { s } from "../../styles";
import { isExternalUrl, sanitizeUrl } from "../../utils/urls";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { ComponentProps } from "../types";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import useDragResize from "./hooks/useDragResize";

type Props = ComponentProps & {
  /** Callback triggered when the image is clicked */
  onClick: () => void;
  /** Callback triggered when the download button is clicked */
  onDownload?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  /** Callback triggered when the zoom in button is clicked */
  onZoomIn?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback triggered when the image is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
  /** The editor view */
  view: EditorView;
  children?: React.ReactElement;
};

const Image = (props: Props) => {
  const { isSelected, node, isEditable, onChangeSize, onClick } = props;
  const { src, layoutClass } = node.attrs;
  const { t } = useTranslation();
  const className = layoutClass ? `image image-${layoutClass}` : "image";
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [naturalWidth, setNaturalWidth] = React.useState(node.attrs.width);
  const [naturalHeight, setNaturalHeight] = React.useState(node.attrs.height);
  const lastTapTimeRef = React.useRef(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const {
    width,
    height,
    setSize,
    handlePointerDown,
    handleDoubleClick,
    dragging,
  } = useDragResize({
    width: node.attrs.width ?? naturalWidth,
    height: node.attrs.height ?? naturalHeight,
    naturalWidth,
    naturalHeight,
    gridSnap: 5,
    onChangeSize,
    ref,
  });

  const isFullWidth = layoutClass === "full-width";
  const isResizable = !!props.onChangeSize && !error;
  const isDownloadable = !!props.onDownload && !error;

  React.useEffect(() => {
    if (node.attrs.width && node.attrs.width !== width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.width]);

  const sanitizedSrc = sanitizeUrl(src);
  const linkMarkType = props.view.state.schema.marks.link;
  const imgLink =
    find(node.attrs.marks ?? [], (mark) => mark.type === linkMarkType.name)
      ?.attrs.href ||
    // Coalescing to `undefined` to avoid empty string in href because empty string
    // in href still shows pointer on hover and click navigates to nowhere
    undefined;
  const handleOpen = React.useCallback(() => {
    window.open(sanitizedSrc, "_blank");
  }, [sanitizedSrc]);

  const widthStyle = isFullWidth
    ? { width: "var(--container-width)" }
    : { width: width || "auto" };

  const handleImageTouchStart = (ev: React.TouchEvent<HTMLDivElement>) => {
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTimeRef.current;

    if (timeSinceLastTap < 300 && isSelected) {
      ev.preventDefault();
      onClick();
    }

    lastTapTimeRef.current = currentTime;
  };

  const handleImageClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable || isSelected) {
      ev.preventDefault();
      onClick();
    }
  };

  const handleDownload = async (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    if (props.onDownload) {
      setIsDownloading(true);
      try {
        await props.onDownload(ev);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  return (
    <div contentEditable={false} className={className} ref={ref}>
      <ImageWrapper
        isFullWidth={isFullWidth}
        className={
          isSelected || dragging
            ? "image-wrapper ProseMirror-selectednode"
            : "image-wrapper"
        }
        style={widthStyle}
      >
        {!dragging && width > 60 && isDownloadable && (
          <Actions>
            {isExternalUrl(src) && (
              <>
                <Button onClick={handleOpen} aria-label={t("Open")}>
                  <GlobeIcon />
                </Button>
                <Separator height={24} />
              </>
            )}
            {imgLink && (
              <>
                <Button
                  // `mousedown` on ancestor `div.ProseMirror` was preventing the `onClick` handler from firing
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={props.onZoomIn}
                  aria-label={t("Zoom in")}
                >
                  <ZoomInIcon />
                </Button>
                <Separator height={24} />
              </>
            )}
            <Button
              onClick={handleDownload}
              // `mousedown` on ancestor `div.ProseMirror` was preventing the `onClick` handler from firing
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={t("Download")}
              disabled={isDownloading}
            >
              <DownloadIcon />
            </Button>
          </Actions>
        )}
        {error ? (
          <Error className={EditorStyleHelper.imageHandle}>
            <Flex gap={4} align="center">
              <CrossIcon size={16} />
              {width > 300 ? t("Image failed to load") : null}
            </Flex>
          </Error>
        ) : (
          <a
            href={imgLink}
            // Do not show hover preview when the image is selected
            className={!isSelected ? "use-hover-preview" : ""}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            <img
              className={EditorStyleHelper.imageHandle}
              style={{
                ...widthStyle,
                display: loaded ? "block" : "none",
              }}
              src={sanitizedSrc}
              alt={node.attrs.alt || ""}
              onError={() => {
                setError(true);
                setLoaded(true);
              }}
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
              onClick={handleImageClick}
              onTouchStart={handleImageTouchStart}
            />
          </a>
        )}
        {!loaded && width && height && (
          <img
            style={{
              ...widthStyle,
              display: "block",
            }}
            src={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              getPlaceholder(width, height)
            )}`}
          />
        )}
        {isEditable && !isFullWidth && isResizable && (
          <>
            <ResizeLeft
              onPointerDown={handlePointerDown("left")}
              onDoubleClick={handleDoubleClick}
              $dragging={!!dragging}
            />
            <ResizeRight
              onPointerDown={handlePointerDown("right")}
              onDoubleClick={handleDoubleClick}
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

function getPlaceholder(width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" />`;
}

export const Error = styled(Flex)`
  max-width: 100%;
  color: ${s("textTertiary")};
  font-size: 14px;
  background: ${s("backgroundSecondary")};
  border-radius: ${EditorStyleHelper.blockRadius};
  height: 80px;
  align-items: center;
  justify-content: center;
  user-select: none;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 150ms ease-in-out;

  &:hover {
    opacity: 1;
  }
`;

const Button = styled.button`
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
  transition: opacity 150ms ease-in-out;

  &:first-child:not(:last-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  &:last-child:not(:first-child) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    color: ${s("text")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: wait;
    pointer-events: none;

    &:hover {
      color: ${s("textSecondary")};
    }

    &:active {
      transform: none;
    }
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
    ${Actions} {
      opacity: 0.9;
    }

    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;

const Separator = styled.div<{ height?: number }>`
  flex-shrink: 0;
  width: 1px;
  height: ${(props) => props.height || 28}px;
  background: ${s("divider")};
`;

export default Image;
