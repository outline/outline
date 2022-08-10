import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Gliffy(props: Props) {
  return (
    <Frame {...props} src={props.attrs.href} title="Gliffy Embed" border />
  );
}

Gliffy.ENABLED = [new RegExp("https?://go\\.gliffy\\.com/go/share/(.*)$")];

export default Gliffy;
