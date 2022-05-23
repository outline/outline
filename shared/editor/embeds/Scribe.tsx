import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default function Scribe(props: Props) {
  const { matches } = props.attrs;
  const shareId = matches[1];

  return (
    <Frame
      {...props}
      src={`https://scribehow.com/embed/${shareId}`}
      title="Scribe"
      border
    />
  );
}

Scribe.ENABLED = [/^https?:\/\/scribehow\.com\/shared\/(.*)$/];
