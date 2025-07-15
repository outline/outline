import * as React from "react";
import { useComponentSize } from "../../hooks/useComponentSize";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default function Berrycast({ matches, ...props }: Props) {
  const normalizedUrl = props.attrs.href.replace(/\/$/, "");
  const ref = React.useRef<HTMLDivElement>(null);
  const { width } = useComponentSize(ref.current);

  return (
    <>
      <div ref={ref} />
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
