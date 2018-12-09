// @flow
import * as React from 'react';
import Frame from './components/Frame';

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
      <Frame
        src={`https://airtable.com/embed/${shareId}`}
        title={`Airtable (${shareId})`}
        border
      />
    );
  }
}
