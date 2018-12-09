// @flow
import * as React from 'react';
import styled from 'styled-components';

const URL_REGEX = new RegExp('https://([w.-]+.)?numeracy.co/(.*)/(.*)$');

type Props = {
  url: string,
};

export default class Numeracy extends React.Component<Props> {
  static hostnames = [URL_REGEX];

  render() {
    // Allow users to paste embed or standard urls and handle them the same
    const normalizedUrl = this.props.url.replace(/\.embed$/, '');

    return (
      <Iframe
        type="text/html"
        width="100%"
        height="400"
        src={`${normalizedUrl}.embed`}
        frameBorder="0"
        title="Numeracy Embed"
      />
    );
  }
}

const Iframe = styled.iframe`
  border: 1px solid;
  border-color: #ddd #ddd #ccc;
  border-radius: 3px;
`;
