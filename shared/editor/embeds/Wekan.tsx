import * as React from "react";
import Frame from "./components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = /^(https?):\/\/([^/]*)\/b\/([^/]*)(.*)?$/;

export default class Wekan extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const proto = matches[1];
    const url = matches[2];
    const rest = matches[4];
    const objectId = matches[3];
    return (
      <Frame
        {...this.props}
        width="100%"
        height="500px"
        src={`${proto}://${url}/b/${objectId}${rest}`}
        title={`Wekan Board @ ${url} (${objectId})`}
      />
    );
  }
}
