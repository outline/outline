// @flow
import * as React from 'react';
import styled from 'styled-components';

const URL_REGEX = new RegExp('https://airtable.com/(shr.*)$');

type Props = {
  url: string,
};

export default class Airtable extends React.Component<Props> {
  static hostnames = [URL_REGEX];

  render() {
    const { url } = this.props;
    const matches = url.match(URL_REGEX);
    if (!matches) return null;

    const shareId = matches[1];

    return (
      <Iframe
        type="text/html"
        width="100%"
        height="400"
        src={`https://airtable.com/embed/${shareId}`}
        frameBorder="0"
        title="Airtable Embed"
      />
    );
  }
}

const Iframe = styled.iframe`
  border: 1px solid;
  border-color: #ddd #ddd #ccc;
  border-radius: 3px;
`;
