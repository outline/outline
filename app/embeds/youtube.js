// @flow
import * as React from 'react';

const urlRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)&?/i;

type Props = {
  url: string,
};

export default {
  hostnames: ['youtube.com', 'youtu.be'],

  render: ({ url }: Props) => {
    const matches = url.match(urlRegex);
    const videoId = matches[1];

    return (
      <iframe
        id="player"
        type="text/html"
        width="320"
        height="140"
        src={`http://www.youtube.com/embed/${videoId}`}
        frameBorder="0"
        title={`youtube-${videoId}`}
      />
    );
  },
};
