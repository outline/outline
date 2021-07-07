// @flow
import * as React from "react";
import Image from "components/Image";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("^https?://sites.google.com/(.*)/(.*)$");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class GoogleSites extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        src={this.props.attrs.href}
        icon={
          <Image
            src="/images/google-sites.png"
            alt="Google Sites Icon"
            width={16}
            height={16}
          />
        }
        canonicalUrl={this.props.attrs.href}
        title="Google Sites"
        border
      />
    );
  }
}
