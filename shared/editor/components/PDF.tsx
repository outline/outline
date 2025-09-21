import React, { useEffect, useState, useRef } from "react";
import useDragResize from "./hooks/useDragResize";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import { ComponentProps } from "../types";

type Props = ComponentProps & {
  /** Callback triggered when the pdf is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
};

export default function PdfViewer(props: Props) {
  const { node, isEditable, onChangeSize, isSelected } = props;
  const { href, name, layoutClass } = node.attrs;
  const [data, setData] = useState<string>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isFullWidth = layoutClass === "full-width";

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

  useEffect(() => {
    fetch(href + "&preview=true")
      .then((res) => res.json())
      .then((res) => {
        setData(res.url);
      })
      .catch(() => {
        // don't really need to do anything here
        // the browser already handles it quite well
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
      className={layoutClass ? `pdf pdf-${layoutClass}` : "pdf"}
      contentEditable={false}
    >
      <iframe
        ref={iframeRef}
        title={name}
        src={data}
        width={isFullWidth ? "730px" : width}
        height={height}
        style={{ pointerEvents: isSelected ? "auto" : "none" }}
      />
      {isEditable && !!props.onChangeSize && !isFullWidth && (
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
