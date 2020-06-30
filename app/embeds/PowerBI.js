// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?app\.powerbi\.com\/view\?r=([a-zA-Z0-9]*)/i;

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class YouTube extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const dashboardId = matches[1];

    return (
      <Frame
        src={`https://app.powerbi.com/r=${dashboardId}`}
        title={`PowerBI (${dashboardId})`}
      />
    );
  }
}
