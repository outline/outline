// @flow
import * as React from 'react';
import Frame from './components/Frame';

const URL_REGEX = new RegExp(
  '^https://([w.-]+.)?mindmeister.com(/maps/public_map_shell)?/(\\d+)(/.*)?$'
);

type Props = {
  url: string,
  matches: string[],
};

export default class Mindmeister extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    console.log(this.props.matches);
    const chartId = this.props.matches[3];

    return (
      <Frame
        src={`https://www.mindmeister.com/maps/public_map_shell/${chartId}`}
        title="Mindmeister Embed"
        border
      />
    );
  }
}
