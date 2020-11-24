// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /^https?:\/\/(www\.|app\.)?lucidchart.com\/documents\/(embeddedchart|view)\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:\/.*)?$/;

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Lucidchart extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const chartId = matches[3];

    return (
      <Frame
        {...this.props}
        src={`https://lucidchart.com/documents/embeddedchart/${chartId}`}
        title="Lucidchart Embed"
      />
    );
  }
}
