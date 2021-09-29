// @flow
import * as React from "react";
import Image from "components/Image";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("^https://viewer.diagrams.net/.*(title=\\w+)?");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

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
