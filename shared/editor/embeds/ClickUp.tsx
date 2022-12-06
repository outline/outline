import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default class ClickUp extends React.Component<Props> {
  static ENABLED = [
    new RegExp("^https?://share\\.clickup\\.com/[a-z]/[a-z]/(.*)/(.*)$"),
    new RegExp(
      "^https?://sharing\\.clickup\\.com/[0-9]+/[a-z]/[a-z]/(.*)/(.*)$"
    ),
  ];

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
