// @flow
import * as React from 'react';
import styled from 'styled-components';

const URL_REGEX = new RegExp(
  'https://([w.-]+.)?figma.com/(file|proto)/([0-9a-zA-Z]{22,128})(?:/.*)?$'
);

type Props = {
  url: string,
};

export default class Figma extends React.Component<Props> {
  static hostnames = [URL_REGEX];

  render() {
    return (
      <Iframe
        type="text/html"
        width="100%"
        height="400"
        src={`https://www.figma.com/embed?embed_host=outline&url=${
          this.props.url
        }`}
        frameBorder="0"
        title="Figma Embed"
        allowFullScreen
      />
    );
  }
}

const Iframe = styled.iframe`
  border: 1px solid;
  border-color: #ddd #ddd #ccc;
  border-radius: 3px;
`;
