import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Iframe(props: Props) {
  const { matches } = props.attrs;
  const url = matches[0];

  return <Frame {...props} src={url} title={`Iframe`} />;
}

Iframe.ENABLED = [/(https?:\/\/)(.+)$/i];

export default Iframe;
