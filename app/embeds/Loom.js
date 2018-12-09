// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = /^https:\/\/(www\.)?useloom.com\/(embed|share)\/(.*)$/;

type Props = {
  url: string,
};

export default class Loom extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const normalizedUrl = this.props.url.replace('share', 'embed');

    return (
      <Frame
        width="420px"
        height="235px"
        src={normalizedUrl}
        title="Loom Embed"
      />
    );
  }
}
