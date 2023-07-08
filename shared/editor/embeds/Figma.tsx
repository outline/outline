import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Figma(props: Props) {
  return (
    <Frame
      {...props}
      src={`https://www.figma.com/embed?embed_host=outline&url=${props.attrs.href}`}
      title="Figma Embed"
      border
    />
  );
}

Figma.ENABLED = [
  new RegExp(
    "^https://([w.-]+\\.)?figma\\.com/(file|proto)/([0-9a-zA-Z]{22,128})(?:/.*)?$"
  ),
];

export default Figma;
