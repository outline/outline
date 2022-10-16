import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function ModeAnalytics(props: Props) {
  // Allow users to paste embed or standard urls and handle them the same
  const normalizedUrl = props.attrs.href.replace(/\/embed$/, "");
  return (
    <Frame
      {...props}
      src={`${normalizedUrl}/embed`}
      title="Mode Analytics Embed"
    />
  );
}

ModeAnalytics.ENABLED = [
  new RegExp("^https://([w.-]+\\.)?modeanalytics\\.com/(.*)/reports/(.*)$"),
];

export default ModeAnalytics;
