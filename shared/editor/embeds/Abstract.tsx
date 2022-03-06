import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default class Abstract extends React.Component<Props> {
  static ENABLED = [
    new RegExp("https?://share.(?:go)?abstract.com/(.*)$"),
    new RegExp("https?://app.(?:go)?abstract.com/(?:share|embed)/(.*)$"),
  ];

  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];
    return (
      <Frame
        {...this.props}
        src={`https://app.goabstract.com/embed/${shareId}`}
        title={`Abstract (${shareId})`}
      />
    );
  }
}
