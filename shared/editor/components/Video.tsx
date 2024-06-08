import * as React from "react";
import styled, { css } from "styled-components";
import { sanitizeUrl } from "../../utils/urls";
import { ComponentProps } from "../types";
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

  const { width, height, setSize, handlePointerDown, dragging } = useDragResize(
    {
      width: node.attrs.width ?? naturalWidth,
      height: node.attrs.height ?? naturalHeight,
      naturalWidth,
      naturalHeight,
      gridSnap: 5,
      onChangeSize,
      ref,
    }
  );

  React.useEffect(() => {
    if (node.attrs.width && node.attrs.width !== width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.width]);

  const style: React.CSSProperties = {
    width: width || "auto",
    maxHeight: height || "auto",
    pointerEvents: dragging ? "none" : "all",
  };

  return (
    <div contentEditable={false} ref={ref}>
      <VideoWrapper
        className={isSelected ? "ProseMirror-selectednode" : ""}
        style={style}
      >
        <StyledVideo
          src={sanitizeUrl(node.attrs.src)}
          title={node.attrs.title}
          style={style}
          controls={!dragging}
        />
        {isEditable && isResizable && (
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
  border-radius: 8px;
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
`;

const StyledVideo = styled.video`
  ${videoStyle}
`;

const VideoWrapper = styled.div`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  white-space: nowrap;
  cursor: default;
  border-radius: 8px;
  user-select: none;
  max-width: 100%;
  overflow: hidden;

  transition-property: width, max-height;
  transition-duration: 150ms;
  transition-timing-function: ease-in-out;

  video {
    transition-property: width, max-height;
    transition-duration: 150ms;
    transition-timing-function: ease-in-out;
  }

  &:hover {
    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;
