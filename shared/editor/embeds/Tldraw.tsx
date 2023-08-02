import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Tldraw(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href}
      title="Tldraw.com (beta) Embed"
      referrerPolicy="origin"
      border
    />
  );
}

Tldraw.ENABLED = [new RegExp("^https?://beta\\.tldraw\\.com/r/(.*)")];

export default Tldraw;
