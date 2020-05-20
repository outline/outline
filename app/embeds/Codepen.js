// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp('^https://codepen.io/(.*?)/(pen|embed)/(.*)$');

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Codepen extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const normalizedUrl = this.props.attrs.href.replace(/\/pen\//, '/embed/');

    return <Frame src={normalizedUrl} title="Codepen Embed" />;
  }
}
