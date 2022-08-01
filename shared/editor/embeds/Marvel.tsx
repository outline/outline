import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp("^https://marvelapp\\.com/([A-Za-z0-9-]{6})/?$");

export default class Marvel extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        src={this.props.attrs.href}
        title="Marvel Embed"
        border
      />
    );
  }
}
