import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp("^https?://cawemo.com/(?:share|embed)/(.*)$");

export default function Cawemo(props: Props) {
  const { matches } = props.attrs;
  const shareId = matches[1];
  return (
    <Frame
      {...props}
      src={`https://cawemo.com/embed/${shareId}`}
      title={"Cawemo Embed"}
      border
    />
  );
}

Cawemo.ENABLED = [URL_REGEX];
