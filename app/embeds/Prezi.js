// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("^https://prezi.com/view/(.*)$");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Prezi extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const url = this.props.attrs.href.replace(/\/embed$/, "");

    return <Frame src={`${url}/embed`} title="Prezi Embed" border />;
  }
}
