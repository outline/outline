// @flow
import * as React from "react";
import Image from "components/Image";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https?://docs.google.com/forms/d/e?/(.*)/(viewform|edit)?$"
);
const URL_REGEX_MINIFIED = new RegExp("^https?://forms.gle/(.*)$");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class GoogleForms extends React.Component<Props> {
  static ENABLED = [URL_REGEX] || [URL_REGEX_MINIFIED];

  render() {
    return (
      <Frame
        {...this.props}
        src={
          URL_REGEX
            ? this.props.attrs.href
            : this.props.attrs.href.replace("edit", "viewform")
        }
        icon={
          <Image
            src="/images/google-forms.png"
            alt="Google Forms Icon"
            width={16}
            height={16}
          />
        }
        canonicalUrl={this.props.attrs.href}
        title="Google Forms"
        border
      />
    );
  }
}
