import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default function Valtown(props: Props) {
  const { matches } = props.attrs;
  const valId = matches[1];

  return (
    <Frame
      {...props}
      src={`https://www.val.town/embed/${valId}`}
      title="Valtown"
      border
    />
  );
}

Valtown.ENABLED = [/^https?:\/\/(?:www.)?val\.town\/(?:v|embed)\/(.*)$/];
