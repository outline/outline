import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = /^https?:\/\/whimsical\.com\/[0-9a-zA-Z-_~]*-([a-zA-Z0-9]+)\/?$/;

export default class Whimsical extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const boardId = matches[1];

    return (
      <Frame
        {...this.props}
        src={`https://whimsical.com/embed/${boardId}`}
        title="Whimsical"
      />
    );
  }
}
