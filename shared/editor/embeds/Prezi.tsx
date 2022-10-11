import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Prezi(props: Props) {
  const url = props.attrs.href.replace(/\/embed$/, "");
  return <Frame {...props} src={`${url}/embed`} title="Prezi Embed" border />;
}

Prezi.ENABLED = [new RegExp("^https://prezi\\.com/view/(.*)$")];

export default Prezi;
