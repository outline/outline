// @flow
import * as React from 'react';
import Frame from './components/Frame';

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
      <Frame
        src={`http://realtimeboard.com/app/embed/${boardId}`}
        title={`RealtimeBoard (${boardId})`}
      />
    );
  }
}
