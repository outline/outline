import * as React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import styled from "styled-components";
import Frame from "./Frame";
import Image from "./Img";
import { ResizeBottom } from "./ResizeHandle";
import useDragResize from "./hooks/useDragResize";

type Props = {
  svg: string;
  documentId: string;
  position: number;
  height?: number;
  isSelected?: boolean;
  isEditable?: boolean;
  onSave?: (data: { svg: string; height?: number }) => void;
  style?: React.CSSProperties;
};

/**
 * Excalidraw embed component that renders Excalidraw in an iframe.
 * Uses postMessage for communication between parent and iframe.
 */
function ExcalidrawEmbed({
  svg,
  documentId,
  position,
  height: initialHeight = 500,
  isSelected,
  isEditable = true,
  onSave,
  style,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const [currentSvg, setCurrentSvg] = useState(svg);

  // Resize functionality
  const naturalWidth = 0; // Full width
  const naturalHeight = 500;
  const isResizable = !!onSave && isEditable;

  const { width, height, setSize, handlePointerDown, dragging } = useDragResize({
    width: naturalWidth,
    height: initialHeight,
    naturalWidth,
    naturalHeight,
    gridSnap: 5,
    onChangeSize: (size) => {
      // Trigger save with new height
      if (onSave && size.height) {
        onSave({ svg: currentSvg, height: size.height });
      }

      // Tell iframe to scroll to content after resize
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "excalidraw:resize",
          },
          window.location.origin
        );
      }
    },
    ref: wrapperRef,
  });

  // Sync node height changes with resize hook
  useEffect(() => {
    if (initialHeight && initialHeight !== height && !dragging) {
      setSize({
        width: naturalWidth,
        height: initialHeight,
      });
    }
  }, [initialHeight, height, dragging, setSize]);

  // Build iframe URL with query params
  // Use a stable ID based on position for the route param
  const iframeUrl = `/excalidraw/${position}?documentId=${encodeURIComponent(
    documentId
  )}&position=${position}&mode=edit`;

  // Handle messages from iframe
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Validate origin - iframe is same-origin
      if (event.origin !== window.location.origin) {
        return;
      }

      const { type, data } = event.data;

      switch (type) {
        case "excalidraw:ready":
          // Iframe is ready, send initial data
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              {
                type: "excalidraw:init",
                data: {
                  svg,
                  documentId,
                  position,
                },
              },
              window.location.origin
            );
            hasInitialized.current = true;
          }
          break;

        case "excalidraw:save":
          // Iframe wants to save
          if (onSave && data) {
            const newSvg = data.svg;
            setCurrentSvg(newSvg);
            onSave({
              svg: newSvg,
              height: data.height,
            });
          }
          break;

        default:
          break;
      }
    },
    [svg, documentId, position, onSave]
  );

  // Listen for messages from iframe
  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  // Send init message when iframe loads (fallback if ready event missed)
  const handleIframeLoad = useCallback(() => {
    if (!hasInitialized.current && iframeRef.current?.contentWindow) {
      // Wait a bit for iframe to set up listeners
      setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: "excalidraw:init",
              data: {
                svg,
                documentId,
                position,
              },
            },
            window.location.origin
          );
          hasInitialized.current = true;
        }
      }, 100);
    }
  }, [svg, documentId, position]);

  const frameStyle: React.CSSProperties = {
    width: width || "100%",
    height: height || 500,
    maxWidth: "100%",
    pointerEvents: dragging ? "none" : "all",
    ...style,
  };

  return (
    <FrameWrapper ref={wrapperRef}>
      <Frame
        ref={iframeRef}
        src={iframeUrl}
        style={frameStyle}
        isSelected={isSelected}
        icon={
          <Image
            src="/images/excalidraw.png"
            alt="Excalidraw"
            width={16}
            height={16}
          />
        }
        title="Excalidraw"
        border
        onLoad={handleIframeLoad}
      />
      {isEditable && isResizable && (
        <StyledResizeBottom
          onPointerDown={handlePointerDown("bottom")}
          $dragging={!!dragging}
        />
      )}
    </FrameWrapper>
  );
}

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
`;

const StyledResizeBottom = styled(ResizeBottom)`
  &:hover {
    opacity: 1;
  }
`;

export default ExcalidrawEmbed;
