import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function SelfHost(props: Props) {
  const { matches } = props.attrs;
  const source = matches[0];
  return <Frame {...props} src={source} title="SelfHost" />;
}

SelfHost.ENABLED = [];
SelfHost.URL_PATH_REGEX = /(.+)/;

export default SelfHost;