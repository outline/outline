// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("https://excalidraw.com/#json=(.*)");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Excalidraw extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        title="Excalidraw"
        src={this.props.attrs.href}
        border
      />
    );
  }
}
