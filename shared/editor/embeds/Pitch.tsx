import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Pitch(props: Props) {
  const shareId = props.attrs.matches[1];
  return (
    <Frame
      {...props}
      src={`https://pitch.com/embed/${shareId}`}
      title="Pitch Embed"
      height="414px"
    />
  );
}

Pitch.ENABLED = [
  new RegExp(
    "^https?://app\\.pitch\\.com/app/(?:presentation/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|public/player)/(.*)$"
  ),
  new RegExp("^https?://pitch\\.com/embed/(.*)$"),
];

export default Pitch;
