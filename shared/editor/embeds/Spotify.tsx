import * as React from "react";
import styled from "styled-components";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Spotify({ matches, ...props }: Props) {
  let pathname = "";
  try {
    const parsed = new URL(props.attrs.href);
    pathname = parsed.pathname;
  } catch (err) {
    pathname = "";
  }

  const normalizedPath = pathname.replace(/^\/embed/, "/");
  let height;

  if (normalizedPath.includes("episode") || normalizedPath.includes("show")) {
    height = 232;
  } else if (normalizedPath.includes("track")) {
    height = 80;
  } else {
    height = 380;
  }

  return (
    <SpotifyFrame
      {...props}
      width="100%"
      height={`${height}px`}
      src={`https://open.spotify.com/embed${normalizedPath}`}
      title="Spotify Embed"
      allow="encrypted-media"
    />
  );
}

const SpotifyFrame = styled(Frame)`
  border-radius: 13px;
`;

export default Spotify;
