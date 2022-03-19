import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = /^https:\/\/(www\.)?(use)?loom.com\/(embed|share)\/(.*)$/;

export default class Loom extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const normalizedUrl = this.props.attrs.href.replace("share", "embed");
    return <Frame {...this.props} src={normalizedUrl} title="Loom Embed" />;
  }
}
