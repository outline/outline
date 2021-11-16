import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https?://app.pitch.com/app/(?:presentation/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|public/player)/(.*)$"
);
type Props = {
  attrs: {
    href: string;
    matches: any;
  };
};

export default class Pitch extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  
  render() {
    const shareId = this.props.attrs.matches[1];
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; height: string... Remove this comment to see the full error message
        src={`https://pitch.com/embed/${shareId}`}
        title="Pitch Embed"
        height="414px"
      />
    );
  }
}
