import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX =
  /(?:https?:\/\/)?(www\.bilibili\.com)\/video\/([\w\d]+)?(\?\S+)?/i;

export default function Bilibili(props: Props) {
  const { matches } = props.attrs;
  const videoId = matches[2];
  return (
    <Frame
      {...props}
      src={`https://player.bilibili.com/player.html?bvid=${videoId}&page=1&high_quality=1`}
      title={`Bilibili Embed (${videoId})`}
    />
  );
}

Bilibili.ENABLED = [URL_REGEX];
