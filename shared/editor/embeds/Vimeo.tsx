import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = /(http|https)?:\/\/(www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|)(\d+)(?:\/|\?)?([\d\w]+)?/;

export default class Vimeo extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const videoId = matches[4];
    const hId = matches[5];

    return (
      <Frame
        {...this.props}
        src={`https://player.vimeo.com/video/${videoId}?byline=0${
          hId ? `&h=${hId}` : ""
        }`}
        title={`Vimeo Embed (${videoId})`}
        height="412px"
        border={false}
        referrerPolicy="origin"
      />
    );
  }
}
