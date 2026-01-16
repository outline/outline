import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import useDragResize from "./hooks/useDragResize";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import type { ComponentProps } from "../types";
import { isFirefox } from "../../utils/browser";
import Flex from "../../components/Flex";
import { s } from "../../styles";
import { Preview, Subtitle, Title } from "./Widget";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

type Props = ComponentProps & {
  /** Icon to display on the left side of the widget */
  icon: React.ReactNode;
  /** Title of the widget */
  title: React.ReactNode;
  /** Context, displayed to right of title */
  context?: React.ReactNode;
  /** Callback triggered when the pdf is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
};

export default function PdfViewer(props: Props) {
  const { node, isEditable, onChangeSize, isSelected } = props;
  const { href, name } = node.attrs;
  const ref = useRef<HTMLDivElement>(null);
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
    if (isFirefox || !ref.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (dragging) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (embedRef.current) {
          embedRef.current.src = "";
          requestAnimationFrame(() => {
            if (embedRef.current) {
              embedRef.current.src = href;
            }
          });
        }
      }, 250);
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [dragging, href]);

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
      <Flex gap={6} align="center">
        {props.icon}
        <Preview>
          <Title>{props.title}</Title>
          <Subtitle>{props.context}</Subtitle>
        </Preview>
      </Flex>
      <embed
        title={name}
        src={href}
        ref={embedRef}
        width={
          // subtract padding and borders from width
          width - 24
        }
        height={height}
        style={{
          pointerEvents:
            !isEditable || (isSelected && !dragging) ? "initial" : "none",
          marginTop: 6,
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
  box-shadow: 0 0 0 1px ${s("divider")};
  border-radius: ${EditorStyleHelper.blockRadius};
  padding: ${EditorStyleHelper.blockRadius};

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
