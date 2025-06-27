import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Trello({ matches, ...props }: Props) {
  const objectId = matches[2];

  if (matches[1] === "c") {
    return (
      <Frame
        {...props}
        width="316px"
        height="141px"
        src={`https://trello.com/embed/card?id=${objectId}`}
        canonicalUrl={props.attrs.href}
        title={`Trello Card (${objectId})`}
      />
    );
  }

  return (
    <Frame
      {...props}
      width="248px"
      height="185px"
      src={`https://trello.com/embed/board?id=${objectId}`}
      canonicalUrl={props.attrs.href}
      title={`Trello Board (${objectId})`}
    />
  );
}

export default Trello;
