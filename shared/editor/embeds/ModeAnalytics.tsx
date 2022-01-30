import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https://([w.-]+.)?modeanalytics.com/(.*)/reports/(.*)$"
);

export default class ModeAnalytics extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    // Allow users to paste embed or standard urls and handle them the same
    const normalizedUrl = this.props.attrs.href.replace(/\/embed$/, "");
    return (
      <Frame
        {...this.props}
        src={`${normalizedUrl}/embed`}
        title="Mode Analytics Embed"
      />
    );
  }
}
