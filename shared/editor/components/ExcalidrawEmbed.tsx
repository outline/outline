import * as React from "react";
import { useEffect, useRef, useCallback } from "react";
import Frame from "./Frame";
import Image from "./Img";

type Props = {
  svg: string;
  documentId: string;
  position: number;
  height?: number;
  isSelected?: boolean;
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
  height = 500,
  isSelected,
  onSave,
  style,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasInitialized = useRef(false);

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
            onSave({
              svg: data.svg,
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
    width: "100%",
    height: height || 500,
    ...style,
  };

  return (
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
      canonicalUrl={`${window.location.origin}${iframeUrl}`}
      border
      onLoad={handleIframeLoad}
    />
  );
}

export default ExcalidrawEmbed;
