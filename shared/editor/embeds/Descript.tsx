import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default function Descript(props: Props) {
  const { matches } = props.attrs;
  const shareId = matches[1];
  return (
    <Frame
      {...props}
      src={`https://share.descript.com/embed/${shareId}`}
      title={`Descript (${shareId})`}
      width="400px"
    />
  );
}

Descript.ENABLED = [
  new RegExp("^https?://share\\.descript\\.com/view/(\\w+)$"),
];
