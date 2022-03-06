import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp("https?://cawemo.com/(?:share|embed)/(.*)$");

export default class Cawemo extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];
    return (
      <Frame
        {...this.props}
        src={`https://cawemo.com/embed/${shareId}`}
        title={"Cawemo Embed"}
        border
      />
    );
  }
}
