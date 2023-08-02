import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Abstract(props: Props) {
  const { matches } = props.attrs;
  const shareId = matches[1];
  return (
    <Frame
      {...props}
      src={`https://app.goabstract.com/embed/${shareId}`}
      title={`Abstract (${shareId})`}
    />
  );
}

Abstract.ENABLED = [
  new RegExp("^https?://share\\.(?:go)?abstract\\.com/(.*)$"),
  new RegExp("^https?://app\\.(?:go)?abstract\\.com/(?:share|embed)/(.*)$"),
];

export default Abstract;
