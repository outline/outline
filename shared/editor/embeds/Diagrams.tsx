import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Image";
import { EmbedProps as Props } from ".";

const URL_REGEX = /^https:\/\/viewer\.diagrams\.net\/.*(title=\\w+)?/;

export default class Diagrams extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  get embedUrl() {
    return this.props.attrs.matches[0];
  }

  get title() {
    let title = "Diagrams.net";
    const url = new URL(this.embedUrl);
    const documentTitle = url.searchParams.get("title");

    if (documentTitle) {
      title += ` (${documentTitle})`;
    }

    return title;
  }

  render() {
    return (
      <Frame
        {...this.props}
        src={this.embedUrl}
        title={this.title}
        border
        icon={
          <Image
            src="/images/diagrams.png"
            alt="Diagrams.net"
            width={16}
            height={16}
          />
        }
      />
    );
  }
}
