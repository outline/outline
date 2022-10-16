import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Typeform(props: Props) {
  return <Frame {...props} src={props.attrs.href} title="Typeform Embed" />;
}

Typeform.ENABLED = [
  new RegExp(
    "^https://([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)\\.typeform\\.com/to/(.*)$"
  ),
];

export default Typeform;
