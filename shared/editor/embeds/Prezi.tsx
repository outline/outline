import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp("^https://prezi\\.com/view/(.*)$");

export default class Prezi extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const url = this.props.attrs.href.replace(/\/embed$/, "");
    return (
      <Frame {...this.props} src={`${url}/embed`} title="Prezi Embed" border />
    );
  }
}
