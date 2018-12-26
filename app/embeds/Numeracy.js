// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp('https://([w.-]+.)?numeracy.co/(.*)/(.*)$');

type Props = {
  url: string,
};

export default class Numeracy extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    // Allow users to paste embed or standard urls and handle them the same
    const normalizedUrl = this.props.url.replace(/\.embed$/, '');

    return (
      <Frame src={`${normalizedUrl}.embed`} title="Numeracy Embed" border />
    );
  }
}
