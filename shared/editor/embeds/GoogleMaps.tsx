import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function GoogleMaps(props: Props) {
  const { matches } = props.attrs;
  const source = matches[0];

  return <Frame {...props} src={source} title={`GoogleMaps`} />;
}

GoogleMaps.ENABLED = [
  /https:\/\/www\.google\.com\/maps\/embed\?[^"]*/, // Match valid google maps embed URL
];

export default GoogleMaps;
