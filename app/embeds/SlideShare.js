// @flow
import * as React from "react";
import Frame from "./components/Frame";
import fetch from "isomorphic-fetch";

const URL_REGEX = new RegExp("^https://(?:www)?.slideshare.net(?:.*)/(?:.*)");

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

async function resolveURL(url) {
  const response = await fetch(url, {
    method: "GET",
  });
  const data = await response.json();

  return data.match(
    /https:\/\/www.slideshare.net\/slideshow\/embed_code\/key\/[a-zA-z0-9]*/g
  );
}

export default class SlideShare extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const url =
      "https://www.slideshare.net/api/oembed/2?url=" +
      this.props.attrs.href +
      "&format=json";

    console.log("url " + url);

    const normalizedUrl = Promise.resolve(resolveURL(url));

    console.log("normalizedUrl " + normalizedUrl);

    return <Frame src={normalizedUrl} title="SlideShare Embed" />;
  }
}
