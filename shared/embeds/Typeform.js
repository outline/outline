// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https://([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?).typeform.com/to/(.*)$"
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Typeform extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        src={this.props.attrs.href}
        title="Typeform Embed"
      />
    );
  }
}
