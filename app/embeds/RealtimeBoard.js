// @flow
import * as React from 'react';

const URL_REGEX = /^https:\/\/realtimeboard.com\/app\/board\/(.*)$/;

type Props = {
  url: string,
};

export default class RealtimeBoard extends React.Component<Props> {
  static hostnames = [URL_REGEX];

  render() {
    const { url } = this.props;
    const matches = url.match(URL_REGEX);
    if (!matches) return null;

    const boardId = matches[1];

    return (
      <iframe
        type="text/html"
        width="100%"
        height="400"
        src={`http://realtimeboard.com/app/embed/${boardId}`}
        frameBorder="0"
        title={`RealtimeBoard (${boardId})`}
        allowFullScreen
      />
    );
  }
}
