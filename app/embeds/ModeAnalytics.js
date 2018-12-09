// @flow
import * as React from 'react';

const URL_REGEX = new RegExp(
  'https://([w.-]+.)?modeanalytics.com/(.*)/reports/(.*)$'
);

type Props = {
  url: string,
};

export default class ModeAnalytics extends React.Component<Props> {
  static hostnames = [URL_REGEX];

  render() {
    // Allow users to paste embed or standard urls and handle them the same
    const normalizedUrl = this.props.url.replace(/\/embed$/, '');

    return (
      <iframe
        type="text/html"
        width="100%"
        height="400"
        src={`${normalizedUrl}/embed`}
        frameBorder="0"
        title="Mode Analytics Embed"
      />
    );
  }
}
