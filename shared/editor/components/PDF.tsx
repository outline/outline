import React, { useEffect, useState, useRef } from "react";
import useDragResize from "./hooks/useDragResize";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import { ComponentProps } from "../types";

type Props = ComponentProps & {
  /** Callback triggered when the download button is clicked */
  onDownload?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback triggered when the image is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
  /** The editor view */
};

export default function PdfViewer(props: Props) {
  const { node, isEditable, onChangeSize, isSelected } = props;
  const { href, name } = node.attrs;
  const [data, setData] = useState<string>();
  // const [isFocused, setIsFocused] = useState<boolean>(false);
  const pdfWrapperRef = useRef<HTMLObjectElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = React.useState(false);
  const { width, height, setSize, handlePointerDown, dragging } = useDragResize(
    {
      width: node.attrs.width,
      height: node.attrs.height,
      naturalWidth: 730,
      naturalHeight: 1033,
      gridSnap: 5,
      onChangeSize,
      ref: iframeRef,
    }
  );

  // useOnClickOutside(pdfWrapperRef, () => setIsFocused(false));

  const isFullWidth = false;
  const isResizable = !!props.onChangeSize && !error;
  useEffect(() => {
    fetch(href + "&preview=true")
      .then((res) => res.json())
      .then((res) => {
        setData(res.url);
      })
      .catch((error) => {
        // to do: better error handling
        setError(error.message);
      });
  }, [href]);

  useEffect(() => {
    if (node.attrs.width && node.attrs.width !== width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.attrs.width]);

  return (
    <div
      ref={pdfWrapperRef}
      style={{
        position: "relative",
        width: "max-content",
        height: "max-content",
      }}
    >
      <iframe
        ref={iframeRef}
        title={name}
        src={data}
        width={width}
        height={height}
        style={{ pointerEvents: isSelected ? "auto" : "none" }}
      />
      {isEditable && !isFullWidth && isResizable && (
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
    </div>
  );
}
