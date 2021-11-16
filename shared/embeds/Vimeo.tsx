import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /(http|https)?:\/\/(www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|)(\d+)(?:|\/\?)/;
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class Vimeo extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  
  render() {
    const { matches } = this.props.attrs;
    const videoId = matches[4];
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; attrs: { href:... Remove this comment to see the full error message
        src={`https://player.vimeo.com/video/${videoId}?byline=0`}
        title={`Vimeo Embed (${videoId})`}
      />
    );
  }
}
