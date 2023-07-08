import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default function DBDiagram(props: Props) {
  const { matches } = props.attrs;
  const shareId = matches[2];

  return (
    <Frame
      {...props}
      src={`https://dbdiagram.io/embed/${shareId}`}
      title={`DBDiagram (${shareId})`}
      width="100%"
      height="400px"
    />
  );
}

DBDiagram.ENABLED = [new RegExp("^https://dbdiagram.io/(embed|d)/(\\w+)$")];
