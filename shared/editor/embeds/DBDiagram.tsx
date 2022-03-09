import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default class DBDiagram extends React.Component<Props> {
  static ENABLED = [new RegExp("https://dbdiagram.io/(embed|d)/(\\w+)$")];

  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[2];

    return (
      <Frame
        {...this.props}
        src={`https://dbdiagram.io/embed/${shareId}`}
        title={`DBDiagram (${shareId})`}
        width="100%"
        height="400px"
      />
    );
  }
}
