import React, { useEffect, useRef } from "react";
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
  const embedRef = useRef<HTMLEmbedElement>(null);
  const isFullWidth = layoutClass === "full-width";

  const { width, height, setSize, handlePointerDown, dragging } = useDragResize(
    {
      width: node.attrs.width,
      height: node.attrs.height,
      naturalWidth: 300,
      naturalHeight: 424,
      gridSnap: 5,
      onChangeSize,
      ref: embedRef,
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

  return (
    <div
      className={layoutClass ? `pdf pdf-${layoutClass}` : "pdf"}
      contentEditable={false}
    >
      <embed
        ref={embedRef}
        title={name}
        src={href}
        type="application/pdf"
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
