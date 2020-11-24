// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("https?://open.spotify.com/(.*)$");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};
export default class Spotify extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  get pathname() {
    try {
      const parsed = new URL(this.props.attrs.href);
      return parsed.pathname;
    } catch (err) {
      return "";
    }
  }

  render() {
    const normalizedPath = this.pathname.replace(/^\/embed/, "/");

    var height;

    if (normalizedPath.includes("episode") || normalizedPath.includes("show")) {
      height = 232;
    } else if (normalizedPath.includes("track")) {
      height = 80;
    } else {
      height = 380;
    }

    return (
      <Frame
        {...this.props}
        width="100%"
        height={`${height}px`}
        src={`https://open.spotify.com/embed${normalizedPath}`}
        title="Spotify Embed"
        allow="encrypted-media"
      />
    );
  }
}
