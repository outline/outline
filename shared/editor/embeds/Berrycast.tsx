import * as React from "react";
import Frame from "../components/Frame";
import useComponentSize from "../components/hooks/useComponentSize";
import { EmbedProps as Props } from ".";

const URL_REGEX = /^https:\/\/(www\.)?berrycast.com\/conversations\/(.*)$/;

export default function Berrycast(props: Props) {
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

Berrycast.ENABLED = [URL_REGEX];
