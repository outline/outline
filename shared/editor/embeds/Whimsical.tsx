import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Whimsical(props: Props) {
  const { matches } = props.attrs;
  const boardId = matches[1];

  return (
    <Frame
      {...props}
      src={`https://whimsical.com/embed/${boardId}`}
      title="Whimsical"
    />
  );
}

Whimsical.ENABLED = [
  /^https?:\/\/whimsical\.com\/[0-9a-zA-Z-_~]*-([a-zA-Z0-9]+)\/?$/,
];

export default Whimsical;
