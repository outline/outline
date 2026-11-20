import * as React from "react";
import styled from "styled-components";
import type { EmbedDescriptor } from "../embeds";
import { getMatchingEmbed } from "../lib/embeds";
import { isAspectRatioLocked } from "../queries/isAspectRatioLocked";
import type { ComponentProps } from "../types";
import DisabledEmbed from "./DisabledEmbed";
import Frame from "./Frame";
import { ResizeHandles, ResizeLeft, ResizeRight } from "./ResizeHandle";
import useDragResize from "./hooks/useDragResize";

/** The height of an embed that has not been resized. */
export const embedDefaultHeight = 400;

type Props = ComponentProps & {
  embeds: EmbedDescriptor[];
  embedsDisabled?: boolean;
  style?: React.CSSProperties;
  onChangeSize?: (props: { width: number; height?: number }) => void;
};

const Embed = (props: Props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { node, isEditable, embedsDisabled, onChangeSize } = props;
  const naturalWidth = 0;
  const naturalHeight = embedDefaultHeight;
  const isResizable = !!onChangeSize && !embedsDisabled;

  const { width, height, handlePointerDown, handleDoubleClick, dragging } =
    useDragResize({
      width: node.attrs.width ?? naturalWidth,
      height: node.attrs.height ?? naturalHeight,
      naturalWidth,
      naturalHeight,
      isLocked: isAspectRatioLocked(node),
      onChangeSize,
      ref,
    });

  const style: React.CSSProperties = {
    width: "100%",
    height: height || embedDefaultHeight,
    pointerEvents: dragging ? "none" : "all",
  };

  // The wrapper takes the width so the resize handles sit on the frame edges.
  return (
    <FrameWrapper
      ref={ref}
      $dragging={!!dragging}
      style={{ width: width || "100%" }}
    >
      <InnerEmbed style={style} {...props} />
      {isEditable && isResizable && (
        <ResizeHandles
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          isVisible={!!dragging}
        />
      )}
    </FrameWrapper>
  );
};

function InnerEmbed({
  isEditable,
  isSelected,
  node,
  embeds,
  embedsDisabled,
  style,
}: Props) {
  const cache = React.useMemo(
    () => getMatchingEmbed(embeds, node.attrs.href),
    [embeds, node.attrs.href]
  );

  if (!cache) {
    return null;
  }

  const { embed, matches } = cache;

  if (embedsDisabled) {
    return (
      <DisabledEmbed
        href={node.attrs.href}
        embed={embed}
        isEditable={isEditable}
        isSelected={isSelected}
      />
    );
  }

  if (embed.transformMatch) {
    const src = embed.transformMatch(matches);
    return (
      <Frame
        src={src}
        style={style}
        isSelected={isSelected}
        canonicalUrl={embed.hideToolbar ? undefined : node.attrs.href}
        title={embed.title}
        referrerPolicy="strict-origin-when-cross-origin"
        border
      />
    );
  }

  if ("component" in embed) {
    return (
      // @ts-expect-error Component type
      <embed.component
        attrs={node.attrs}
        style={style}
        matches={matches}
        isEditable={isEditable}
        isSelected={isSelected}
        embed={embed}
      />
    );
  }

  return null;
}

const FrameWrapper = styled.div<{ $dragging: boolean }>`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  white-space: nowrap;
  cursor: default;
  border-radius: 8px;
  user-select: none;
  max-width: 100%;

  transition-property: width, max-height;
  transition-duration: ${(props) => (props.$dragging ? "0ms" : "150ms")};
  transition-timing-function: ease-in-out;

  &:hover {
    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;

export default Embed;
