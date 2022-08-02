import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https?://share\\.clickup\\.com/[a-z]/[a-z]/(.*)/(.*)$"
);

export default class ClickUp extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        src={this.props.attrs.href}
        title="ClickUp Embed"
      />
    );
  }
}
