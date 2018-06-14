// @flow
import * as React from 'react';
import MediaBlock from 'components/MediaBlock';

type Props = {
  url: string,
  metadata: Object,
};

class Youtube extends React.Component<Props> {
  static requestData = true;
  static hostnames = ['youtube.com', 'youtu.be'];

  render() {
    const { url, metadata } = this.props;

    if (!metadata || !metadata.openGraph) {
      return <MediaBlock url={url} subtitle="YouTube" isLoading />;
    }

    return (
      <MediaBlock
        url={url}
        title={metadata.openGraph.title}
        subtitle={metadata.openGraph.description}
        image={metadata.openGraph.image.url}
      />
    );
  }
}

export default Youtube;
