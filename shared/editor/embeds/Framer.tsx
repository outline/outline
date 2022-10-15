import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Framer(props: Props) {
  return (
    <Frame {...props} src={props.attrs.href} title="Framer Embed" border />
  );
}

Framer.ENABLED = [new RegExp("^https://framer.cloud/(.*)$")];

export default Framer;
