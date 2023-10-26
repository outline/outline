import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Instagram(props: Props) {
  const { matches } = props.attrs;
  return <Frame {...props} src={`${matches[0]}/embed`} title="Instagram" />;
}

Instagram.ENABLED = [
  /^https?:\/\/www\.instagram\.com\/(p|reel)\/([\w-]+)(\/?utm_source=\w+)?/,
];

export default Instagram;
