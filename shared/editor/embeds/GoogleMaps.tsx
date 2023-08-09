import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function GoogleMaps(props: Props) {
  const { matches } = props.attrs;
  const source = matches[1];

  return <Frame {...props} src={source} title={`GoogleMaps`} />;
}

GoogleMaps.ENABLED = [
  /src="(https:\/\/www\.google\.com\/maps\/embed[^"]+)"/, // Extract src from google maps iframe embed code
];

export default GoogleMaps;
