// @flow
import * as React from "react";
import Image from "components/Image";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https?://datastudio.google.com/embed/reporting/(.*)/page/(.*)$"
);
const URL_REGEX_SECONDARY = new RegExp(
  "^https?://datastudio.google.com/u/0/reporting/(.*)/page/(.*)/edit?$"
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class GoogleDataStudio extends React.Component<Props> {
  static ENABLED = [URL_REGEX] || [URL_REGEX_SECONDARY];

  render() {
    return (
      <Frame
        {...this.props}
        src={
          URL_REGEX_SECONDARY
            ? this.props.attrs.href.replace("u/0", "embed").replace("/edit", "")
            : this.props.attrs.href
        }
        icon={
          <Image
            src="/images/google-datastudio.png"
            alt="Google Data Studio Icon"
            width={16}
            height={16}
          />
        }
        canonicalUrl={this.props.attrs.href}
        title="Google DataStudio"
        border
      />
    );
  }
}
