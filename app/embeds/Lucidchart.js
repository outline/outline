// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = /^https:\/\/(www\.)?lucidchart.com\/documents\/(embeddedchart|view)\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:\/.*)?$/;

type Props = {
  url: string,
  matches: string[],
};

export default class Lucidchart extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props;
    const chartId = matches[3];

    return (
      <Frame
        src={`http://lucidchart.com/documents/embeddedchart/${chartId}`}
        title="Lucidchart Embed"
      />
    );
  }
}
