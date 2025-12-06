import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import useDragResize from "./hooks/useDragResize";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import { ComponentProps } from "../types";
import { isFirefox } from "@shared/utils/browser";

type Props = ComponentProps & {
  /** Callback triggered when the pdf is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
};

export default function PdfViewer(props: Props) {
  const { node, isEditable, onChangeSize, isSelected } = props;
  const { href, name } = node.attrs;
  const ref = useRef<HTMLEmbedElement>(null);
  const embedRef = useRef<HTMLEmbedElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { width, height, setSize, handlePointerDown, dragging } = useDragResize(
    {
      width: node.attrs.width,
      height: node.attrs.height,
      naturalWidth: 300,
      naturalHeight: 424,
      gridSnap: 5,
      onChangeSize,
      ref,
    }
  );

  useEffect(() => {
    if (node.attrs.width && node.attrs.width !== width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.attrs.width]);

  // force embed to reload, so the content fits the new size.
  useEffect(() => {
    // firefox handles resizing on its own
    // and forced reload causes the parent to collapse while resizing
    if (isFirefox()) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!dragging && embedRef.current) {
      debounceTimerRef.current = setTimeout(() => {
        if (embedRef.current) {
          embedRef.current.src = "";
          requestAnimationFrame(() => {
            if (embedRef.current) {
              embedRef.current.src = href;
            }
          });
        }
      }, 500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  });

  return (
    <PDFWrapper
      contentEditable={false}
      ref={ref}
      className={
        isSelected || dragging
          ? "pdf-wrapper ProseMirror-selectednode"
          : "pdf-wrapper"
      }
      style={{ width: width ?? "auto" }}
      $dragging={dragging}
    >
      <embed
        title={name}
        src={href}
        ref={embedRef}
        type="application/pdf"
        width={width}
        height={height}
        style={{
          pointerEvents: isSelected && !dragging ? "initial" : "none",
        }}
      />
      {isEditable && !!props.onChangeSize && (
        <>
          <ResizeLeft
            onPointerDown={handlePointerDown("left")}
            $dragging={isSelected || dragging}
          />
          <ResizeRight
            onPointerDown={handlePointerDown("right")}
            $dragging={isSelected || dragging}
          />
        </>
      )}
    </PDFWrapper>
  );
}

const PDFWrapper = styled.div<{ $dragging: boolean }>`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
  transition-property: width, height;
  transition-duration: 120ms;
  transition-timing-function: ease-in-out;
  overflow: hidden;
  will-change: ${(props) => (props.$dragging ? "width, height" : "auto")};

  embed {
    transition-property: width, height;
    transition-duration: 120ms;
    transition-timing-function: ease-in-out;
    will-change: ${(props) => (props.$dragging ? "width, height" : "auto")};
  }

  &:hover {
    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;
