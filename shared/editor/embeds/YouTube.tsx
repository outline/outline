import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function YouTube({ matches, ...props }: Props) {
  const videoId = matches[1];

  let src;
  try {
    const url = new URL(props.attrs.href);
    const searchParams = new URLSearchParams(url.search);
    const start = searchParams.get("t")?.replace(/s$/, "");

    // Youtube returns the url in a html encoded format where
    // '&' is replaced by '&amp;'. So we also check if the search params
    // contain html encoded query params.
    const clip = (
      searchParams.get("clip") || searchParams.get("amp;clip")
    )?.replace(/s$/, "");
    const clipt = (
      searchParams.get("clipt") || searchParams.get("amp;clipt")
    )?.replace(/s$/, "");

    src = `https://www.youtube.com/embed/${videoId}?modestbranding=1${
      start ? `&start=${start}` : ""
    }${clip ? `&clip=${clip}` : ""}${clipt ? `&clipt=${clipt}` : ""}`;
  } catch (_e) {
    // noop
  }

  return <Frame {...props} src={src} title={`YouTube (${videoId})`} />;
}

export default YouTube;
