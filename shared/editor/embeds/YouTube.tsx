import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function YouTube({ matches, ...props }: Props) {
  const videoId = matches[1];

  let start;
  try {
    const url = new URL(props.attrs.href);
    const searchParams = new URLSearchParams(url.search);
    start = searchParams.get("t")?.replace(/s$/, "");
  } catch (_e) {
    // noop
  }

  return (
    <Frame
      {...props}
      src={`https://www.youtube.com/embed/${videoId}?modestbranding=1${
        start ? `&start=${start}` : ""
      }`}
      title={`YouTube (${videoId})`}
    />
  );
}

export default YouTube;
