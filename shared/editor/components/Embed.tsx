import * as React from "react";
import styled from "styled-components";
import type { EmbedDescriptor } from "../embeds";
import { getMatchingEmbed } from "../lib/embeds";
import type { ComponentProps } from "../types";
import DisabledEmbed from "./DisabledEmbed";
import Frame from "./Frame";
import {
  ResizeLeft,
  ResizeRight,
  ResizeTopLeft,
  ResizeTopRight,
  ResizeBottomLeft,
  ResizeBottomRight,
} from "./ResizeHandle";
import useDragResize from "./hooks/useDragResize";

type Props = ComponentProps & {
  embeds: EmbedDescriptor[];
  embedsDisabled?: boolean;
  style?: React.CSSProperties;
  onChangeSize?: (props: { width: number; height?: number }) => void;
};

/** The height an embed is rendered at when no height attribute is set. */
export const EmbedDefaultHeight = 400;

const Embed = (props: Props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { node, isEditable, embedsDisabled, onChangeSize } = props;
  const naturalWidth = 0;
  const naturalHeight = EmbedDefaultHeight;
  const isResizable = !!onChangeSize && !embedsDisabled;

  const { width, height, setSize, handlePointerDown, dragging } = useDragResize(
    {
      width: node.attrs.width ?? naturalWidth,
      height: node.attrs.height ?? naturalHeight,
      naturalWidth,
      naturalHeight,
      onChangeSize,
      ref,
    }
  );

  React.useEffect(() => {
    const nextWidth = node.attrs.width ?? naturalWidth;
    const nextHeight = node.attrs.height ?? naturalHeight;
    if (nextWidth !== width || nextHeight !== height) {
      setSize({
        width: nextWidth,
        height: nextHeight,
      });
    }
  }, [node.attrs.width, node.attrs.height]);

  const style: React.CSSProperties = {
    width: width || "100%",
    height: height || EmbedDefaultHeight,
    maxWidth: "100%",
    pointerEvents: dragging ? "none" : "all",
  };

  return (
    <FrameWrapper
      ref={ref}
      $dragging={!!dragging}
      style={{ width: style.width }}
    >
      <InnerEmbed style={style} {...props} />
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
          <ResizeTopLeft
            onPointerDown={handlePointerDown("topLeft")}
            $dragging={!!dragging}
          />
          <ResizeTopRight
            onPointerDown={handlePointerDown("topRight")}
            $dragging={!!dragging}
          />
          <ResizeBottomLeft
            onPointerDown={handlePointerDown("bottomLeft")}
            $dragging={!!dragging}
          />
          <ResizeBottomRight
            onPointerDown={handlePointerDown("bottomRight")}
            $dragging={!!dragging}
          />
        </>
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
    ${ResizeLeft}, ${ResizeRight},
    ${ResizeTopLeft}, ${ResizeTopRight}, ${ResizeBottomLeft}, ${ResizeBottomRight} {
      opacity: 1;
    }
  }
`;

export default Embed;
