// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp(
  '^https?://docs.google.com/spreadsheets/d/(.*)/pub(.*)$'
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class GoogleSlides extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame src={this.props.attrs.href} title="Google Sheets Embed" border />
    );
  }
}
