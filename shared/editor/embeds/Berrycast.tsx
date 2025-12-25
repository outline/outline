import * as React from "react";
import useMeasure from "react-use-measure";
import Frame from "../components/Frame";
import type { EmbedProps as Props } from ".";

export default function Berrycast({ matches, ...props }: Props) {
  const normalizedUrl = props.attrs.href.replace(/\/$/, "");
  const [measureRef, { width }] = useMeasure();

  return (
    <>
      <div ref={measureRef} />
      <Frame
        {...props}
        src={`${normalizedUrl}/video-player`}
        title="Berrycast Embed"
        height={`${0.5625 * width}px`}
        border={false}
      />
    </>
  );
}
