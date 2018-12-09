// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp('^https://framer.cloud/(.*)$');

type Props = {
  url: string,
};

export default class Framer extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return <Frame src={this.props.url} title="Framer Embed" border />;
  }
}
