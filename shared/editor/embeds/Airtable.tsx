import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp("https://airtable.com/(?:embed/)?(shr.*)$");

export default class Airtable extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];
    return (
      <Frame
        {...this.props}
        src={`https://airtable.com/embed/${shareId}`}
        title={`Airtable (${shareId})`}
        border
      />
    );
  }
}
