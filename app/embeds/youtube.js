// @flow
import * as React from 'react';
import MediaBlock from 'components/MediaBlock';

type Props = {
  url: string,
  metadata: Object,
};

export default {
  requestData: true,
  hostnames: ['youtube.com', 'youtu.be'],

  render: ({ url, metadata }: Props) => {
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
  },
};
