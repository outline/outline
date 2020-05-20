// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp(
  'https://([w.-]+.)?figma.com/(file|proto)/([0-9a-zA-Z]{22,128})(?:/.*)?$'
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Figma extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        src={`https://www.figma.com/embed?embed_host=outline&url=${
          this.props.attrs.href
        }`}
        title="Figma Embed"
        border
      />
    );
  }
}
