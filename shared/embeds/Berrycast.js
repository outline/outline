// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /^https:\/\/www\.berrycast\.com\/conversations\/([0-9A-F-]*)(?:\/?)$/i;

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Berrycast extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const videoId = matches[1];

    return (
      <Frame
        {...this.props}
        height="465px"
        src={`https://www.berrycast.com/conversations/${videoId}/video-player`}
        title={`Berrycast Embed (${videoId})`}
      />
    );
  }
}
