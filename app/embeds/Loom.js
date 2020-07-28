// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /^https:\/\/(www\.)?(use)?loom.com\/(embed|share)\/(.*)$/;

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Loom extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const normalizedUrl = this.props.attrs.href.replace("share", "embed");

    return <Frame src={normalizedUrl} title="Loom Embed" />;
  }
}
