import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function IFrame({ matches, ...props }: Props) {
  const srcRegex = /<iframe[^>]+src="([^"]+)"[^>]*>/i;
  const match = props.attrs.href.match(srcRegex);

  if (match && match[1]) {
    const src = match[1];
    return (
      <Frame
        {...props}
        src={src}
        title="iFrame Embed"
        referrerPolicy="origin"
        border
      />
    );
  }
  return null;
}

export default IFrame;
