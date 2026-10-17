import * as React from "react";
import styled, { css } from "styled-components";
import { sanitizeUrl } from "../../utils/urls";
import { getDisplayUrl } from "../lib/uploadPlaceholder";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { ComponentProps } from "../types";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import useDragResize from "./hooks/useDragResize";

type Props = ComponentProps & {
  /** Callback triggered when the video is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
  children?: React.ReactElement;
};

export default function Video(props: Props) {
  const { isSelected, node, isEditable, children, onChangeSize } = props;
  const [naturalWidth] = React.useState(node.attrs.width);
  const [naturalHeight] = React.useState(node.attrs.height);
  const ref = React.useRef<HTMLDivElement>(null);
  const isResizable = !!onChangeSize;

  const { width, height, handlePointerDown, handleDoubleClick, dragging } =
    useDragResize({
      width: node.attrs.width ?? naturalWidth,
      height: node.attrs.height ?? naturalHeight,
      naturalWidth,
      naturalHeight,
      onChangeSize,
      ref,
    });

  const style: React.CSSProperties = {
    width: width || "auto",
    maxHeight: height || "auto",
    pointerEvents: dragging ? "none" : "all",
  };

  return (
    <div contentEditable={false} ref={ref}>
      <VideoWrapper
        className={
          isSelected
            ? `${EditorStyleHelper.videoWrapper} ProseMirror-selectednode`
            : EditorStyleHelper.videoWrapper
        }
        $dragging={!!dragging}
        style={style}
      >
        <StyledVideo
          src={sanitizeUrl(getDisplayUrl(props.view.state, node.attrs.src))}
          title={node.attrs.title}
          // Reserves the aspect ratio of the video before its metadata loads.
          width={width || undefined}
          height={height || undefined}
          style={style}
          controls={!dragging}
        />
        {isEditable && isResizable && (
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
      </VideoWrapper>
      {children}
    </div>
  );
}

export const videoStyle = css`
  max-width: 100%;
  height: auto;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text} !important;
  margin: -2px;
  padding: 2px;
  border-radius: ${EditorStyleHelper.mediaRadius};
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
`;

const StyledVideo = styled.video`
  ${videoStyle}
`;

const VideoWrapper = styled.div<{ $dragging: boolean }>`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  white-space: nowrap;
  cursor: default;
  border-radius: ${EditorStyleHelper.mediaRadius};
  user-select: none;
  max-width: 100%;
  overflow: hidden;

  transition-property: width, max-height;
  transition-duration: ${(props) => (props.$dragging ? "0ms" : "150ms")};
  transition-timing-function: ease-in-out;

  video {
    transition-property: width, max-height;
    transition-duration: ${(props) => (props.$dragging ? "0ms" : "150ms")};
    transition-timing-function: ease-in-out;
  }

  &.ProseMirror-selectednode,
  &.ProseMirror-selectednode video {
    border-radius: ${EditorStyleHelper.mediaSelectedRadius};
  }

  &:hover {
    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;
