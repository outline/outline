import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Mindmeister(props: Props) {
  const chartId =
    props.attrs.matches[4] +
    (props.attrs.matches[5] || "") +
    (props.attrs.matches[6] || "");
  return (
    <Frame
      {...props}
      src={`https://www.mindmeister.com/maps/public_map_shell/${chartId}`}
      title="Mindmeister Embed"
      border
    />
  );
}

Mindmeister.ENABLED = [
  new RegExp(
    "^https://([w.-]+\\.)?(mindmeister\\.com|mm\\.tt)(/maps/public_map_shell)?/(\\d+)(\\?t=.*)?(/.*)?$"
  ),
];

export default Mindmeister;
