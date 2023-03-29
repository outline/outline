import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function YouTube(props: Props) {
  const { matches } = props.attrs;
  const videoId = matches[1];
  const queryParameters = matches[2];

  return (
    <Frame
      {...props}
      src={`https://www.youtube.com/embed/${videoId}?modestbranding=1${
        queryParameters ? `&${queryParameters}` : ""
      }`}
      title={`YouTube (${videoId})`}
    />
  );
}

YouTube.ENABLED = [
  /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([a-zA-Z0-9_-]{11})(?:\?(.*))?$/i,
];

export default YouTube;
