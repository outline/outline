import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https?://app\\.pitch\\.com/app/(?:presentation/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|public/player)/(.*)$"
);

export default class Pitch extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const shareId = this.props.attrs.matches[1];
    return (
      <Frame
        {...this.props}
        src={`https://pitch.com/embed/${shareId}`}
        title="Pitch Embed"
        height="414px"
      />
    );
  }
}
