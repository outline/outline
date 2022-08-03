import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https?://.*/p/([0-9][0-9]*)\\?embed=true$" // Ensure its a page URL
);

export default class Grist extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame {...this.props} src={this.props.attrs.href} title="Grist Embed" />
    );
  }
}
