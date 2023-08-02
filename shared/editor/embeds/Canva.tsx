import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Canva(props: Props) {
  const { matches } = props.attrs;
  const embedId = matches[1];

  return (
    <Frame
      {...props}
      src={`https://www.canva.com/design/${embedId}/view?embed`}
      title="Canva"
    />
  );
}

Canva.ENABLED = [
  /^https:\/\/(?:www\.)?canva\.com\/design\/([a-zA-Z0-9]*)\/(.*)$/,
];

export default Canva;
