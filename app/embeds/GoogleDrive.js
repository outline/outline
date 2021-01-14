// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https?://drive.google.com/file/d/(.*)/(preview|view).?usp=sharing$"
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class GoogleDrive extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        src={this.props.attrs.href.replace("/view", "/preview")}
        title="Google Drive Embed"
      />
    );
  }
}
