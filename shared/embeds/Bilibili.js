// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /(?:https?:\/\/)?(www\.bilibili\.com)\/video\/([\w\d]+)?(\?\S+)?/i;

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Vimeo extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const videoId = matches[2];

    return (
      <Frame
        {...this.props}
        src={`https://player.bilibili.com/player.html?bvid=${videoId}&page=1&high_quality=1`}
        title={`Bilibili Embed (${videoId})`}
      />
    );
  }
}
