import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp("^https://codepen.io/(.*?)/(pen|embed)/(.*)$");

export default class Codepen extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const normalizedUrl = this.props.attrs.href.replace(/\/pen\//, "/embed/");
    return <Frame {...this.props} src={normalizedUrl} title="Codepen Embed" />;
  }
}
