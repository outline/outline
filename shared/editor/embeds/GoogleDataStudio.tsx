import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Image";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https?://datastudio.google.com/(embed|u/0)/reporting/(.*)/page/(.*)(/edit)?$"
);

export default class GoogleDataStudio extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        src={this.props.attrs.href.replace("u/0", "embed").replace("/edit", "")}
        icon={
          <Image
            src="/images/google-datastudio.png"
            alt="Google Data Studio Icon"
            width={16}
            height={16}
          />
        }
        canonicalUrl={this.props.attrs.href}
        title="Google Data Studio"
        border
      />
    );
  }
}
