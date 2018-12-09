// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp(
  '^https://(invis.io/.*)|(projects.invisionapp.com/share/.*)$'
);

type Props = {
  url: string,
};

export default class InVision extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return <Frame src={this.props.url} title="InVision Embed" />;
  }
}
