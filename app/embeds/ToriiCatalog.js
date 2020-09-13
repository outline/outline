// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "https:\/\/catalog.toriihq.com\/[0-9a-zA-Z]*$"
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class ToriiCatalog extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        src={this.props.attrs.href}
        title="Torii Catalog Embed"
        border
      />
    );
  }
}
