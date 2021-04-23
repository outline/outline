// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /(?:https?:\/\/)?web.microsoftstream.com(?:\/embed)?\/video\/([a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12})(?:\?.*)?/i;

type Props = {|
  isSelected: boolean,
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class MicrosoftStream extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const videoId = matches[1];

    return (
      <Frame
        {...this.props}
        src={`https://web.microsoftstream.com/embed/video/${videoId}?autoplay=false&amp;showinfo=true`}
        title={`Microsoft Stream (${videoId})`}
      />
    );
  }
}
