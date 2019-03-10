// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = /(http|https)?:\/\/(www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)/;

type Props = {
  url: string,
  matches: string[],
};

export default class Vimeo extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props;
    const videoId = matches[4];

    return (
      <Frame
        src={`https://player.vimeo.com/video/${videoId}?byline=0`}
        title={`Vimeo Embed (${videoId})`}
      />
    );
  }
}
