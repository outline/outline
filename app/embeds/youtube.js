// @flow
import * as React from 'react';
import MediaBlock from 'components/MediaBlock';

const urlRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)&?/i;

type Props = {
  url: string,
  metadata: Object,
};

export default class YouTube extends React.Component<Props> {
  static requestData = true;
  static hostnames = ['youtube.com', 'youtu.be'];

  render() {
    const { url, metadata } = this.props;
    const matches = url.match(urlRegex);
    const videoId = matches[1];

    if (!metadata || !metadata.openGraph) {
      return <MediaBlock url={url} subtitle="YouTube" isLoading />;
    }

    return (
      <MediaBlock
        url={url}
        title={metadata.openGraph.title}
        subtitle={metadata.openGraph.description}
        image={metadata.openGraph.image.url}
      >
        <iframe
          id="player"
          type="text/html"
          width="320"
          height="140"
          src={`http://www.youtube.com/embed/${videoId}`}
          frameBorder="0"
          title={`youtube-${videoId}`}
        />
      </MediaBlock>
    );
  }
}
