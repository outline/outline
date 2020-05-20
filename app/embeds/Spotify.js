// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp('https?://open.spotify.com/(.*)$');

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};
export default class Spotify extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  get pathname() {
    try {
      const parsed = new URL(this.props.attrs.href);
      return parsed.pathname;
    } catch (err) {
      return '';
    }
  }

  render() {
    const normalizedPath = this.pathname.replace(/^\/embed/, '/');

    return (
      <Frame
        width="300px"
        height="380px"
        src={`https://open.spotify.com/embed${normalizedPath}`}
        title="Spotify Embed"
        allow="encrypted-media"
      />
    );
  }
}
