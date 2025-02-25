import * as React from "react";
import styled from "styled-components";
import { EmbedDescriptor } from "../embeds";
import { getMatchingEmbed } from "../lib/embeds";
import { ComponentProps } from "../types";
import DisabledEmbed from "./DisabledEmbed";
import Frame from "./Frame";
import { ResizeBottom, ResizeLeft, ResizeRight } from "./ResizeHandle";
import useDragResize from "./hooks/useDragResize";

type Props = ComponentProps & {
  embeds: EmbedDescriptor[];
  embedsDisabled?: boolean;
  style?: React.CSSProperties;
  onChangeSize?: (props: { width: number; height?: number }) => void;
};

const Embed = (props: Props) => {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const { node, isEditable, onChangeSize } = props;
  const naturalWidth = 0;
  const naturalHeight = 400;
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
    if (node.attrs.height && node.attrs.height !== height) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.height]);

  const style: React.CSSProperties = {
    width: width || "100%",
    height: height || 400,
    maxWidth: "100%",
    pointerEvents: dragging ? "none" : "all",
  };

  return (
    <FrameWrapper ref={ref}>
      <InnerEmbed ref={ref} style={style} {...props} />
      {isEditable && isResizable && (
        <>
          <ResizeBottom
            onPointerDown={handlePointerDown("bottom")}
            $dragging={!!dragging}
          />
        </>
      )}
    </FrameWrapper>
  );
};

const InnerEmbed = React.forwardRef<HTMLIFrameElement, Props>(
  function InnerEmbed_(
    { isEditable, isSelected, theme, node, embeds, embedsDisabled, style },
    ref
  ) {
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
          theme={theme}
        />
      );
    }

    if (embed.transformMatch) {
      const src = embed.transformMatch(matches);
      return (
        <Frame
          ref={ref}
          src={src}
          style={style}
          isSelected={isSelected}
          canonicalUrl={embed.hideToolbar ? undefined : node.attrs.href}
          title={embed.title}
          referrerPolicy="origin"
          border
        />
      );
    }

    if ("component" in embed) {
      return (
        // @ts-expect-error Component type
        <embed.component
          ref={ref}
          attrs={node.attrs}
          style={style}
          matches={matches}
          isEditable={isEditable}
          isSelected={isSelected}
          embed={embed}
          theme={theme}
        />
      );
    }

    return null;
  }
);

const FrameWrapper = styled.div`
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
  transition-duration: 150ms;
  transition-timing-function: ease-in-out;

  &:hover {
    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;

export default Embed;
