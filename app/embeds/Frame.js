// @flow
import * as React from "react";
import FrameComponent from "./components/Frame";

const URL_REGEX = new RegExp("^https?://(.*)$");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Frame extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <FrameComponent
        {...this.props}
        src={this.props.attrs.href}
        icon={
          <img
            src="/images/frame.png"
            alt="Frame Icon"
            width={16}
            height={16}
          />
        }
        canonicalUrl={this.props.attrs.href}
        title="Frame"
        border
      />
    );
  }
}
