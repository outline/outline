import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp("^https://codepen.io/(.*?)/(pen|embed)/(.*)$");

export default function Codepen(props: Props) {
  const normalizedUrl = props.attrs.href.replace(/\/pen\//, "/embed/");
  return <Frame {...props} src={normalizedUrl} title="Codepen Embed" />;
}

Codepen.ENABLED = [URL_REGEX];
