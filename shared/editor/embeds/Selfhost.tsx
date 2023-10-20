import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Selfhost(props: Props) {
  const { matches } = props.attrs;
  const source = matches[0];
  return <Frame {...props} src={source} title="Selfhost" />;
}

Selfhost.URL_PATH_REGEX = /(.+)/;

export default Selfhost;