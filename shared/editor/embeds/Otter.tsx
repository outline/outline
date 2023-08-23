import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Otter(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href}
      title="Otter.ai Embed"
      referrerPolicy="origin"
      border
    />
  );
}

Otter.ENABLED = [new RegExp("^https?://otter\\.ai/[su]/(.*)$")];

export default Otter;
