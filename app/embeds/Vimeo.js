// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = /(http|https)?:\/\/(www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)/;

type Props = {
  url: string,
};

export default class Vimeo extends React.Component<Props> {
  static hostnames = [URL_REGEX];

  render() {
    const { url } = this.props;
    const matches = url.match(URL_REGEX);
    if (!matches) return null;

    const videoId = matches[4];

    return (
      <Frame
        width="420"
        height="235"
        src={`http://player.vimeo.com/video/${videoId}?byline=0`}
        title={`Vimeo Embed (${videoId})`}
      />
    );
  }
}
