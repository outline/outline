import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function GoogleMaps(props: Props) {
  const { matches } = props.attrs;
  const source = matches[0];

  return <Frame {...props} src={source} title="Google Maps" />;
}

GoogleMaps.ENABLED = [
  new RegExp("^https?://www\\.google\\.com/maps/embed\\?(.*)$"),
];

export default GoogleMaps;
