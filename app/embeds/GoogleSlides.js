// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("^https?://docs.google.com/presentation/d/(.*)$");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class GoogleSlides extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        src={this.props.attrs.href
          .replace("/edit", "/preview")
          .replace("/pub", "/embed")}
        icon={
          <img
            src="/images/google-slides.png"
            alt="Google Slides Icon"
            width={16}
            height={16}
          />
        }
        canonicalUrl={this.props.attrs.href}
        title="Google Slides"
        border
      />
    );
  }
}
