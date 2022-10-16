import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default function ClickUp(props: Props) {
  return <Frame {...props} src={props.attrs.href} title="ClickUp Embed" />;
}

ClickUp.ENABLED = [
  new RegExp("^https?://share\\.clickup\\.com/[a-z]/[a-z]/(.*)/(.*)$"),
  new RegExp("^https?://sharing\\.clickup\\.com/[0-9]+/[a-z]/[a-z]/(.*)/(.*)$"),
];
