import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Marvel(props: Props) {
  return (
    <Frame {...props} src={props.attrs.href} title="Marvel Embed" border />
  );
}

Marvel.ENABLED = [new RegExp("^https://marvelapp\\.com/([A-Za-z0-9-]{6})/?$")];

export default Marvel;
