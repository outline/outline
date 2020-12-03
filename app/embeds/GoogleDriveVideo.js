// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https?://drive.google.com/file/d/(.*)/view$"
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class GoogleDriveVideo extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame src={this.props.attrs.href} title="Google Drive Video Embed" />
    );
  }
}
