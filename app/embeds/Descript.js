// @flow
import * as React from "react";
import Frame from "./components/Frame";

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Descript extends React.Component<Props> {
  static ENABLED = [new RegExp("https?://share.descript.com/view/(\\w+)$")];

  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];

    return (
      <Frame
        {...this.props}
        src={`https://share.descript.com/embed/${shareId}`}
        title={`Descript (${shareId})`}
        width="400px"
      />
    );
  }
}
