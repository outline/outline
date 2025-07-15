import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Linkedin({ matches, ...props }: Props) {
  const objectId = matches[2];
  const postType = matches[1];
  if (matches[3] === "embed") {
    return <Frame {...props} src={`${props.attrs.href}`} title="LinkedIn" />;
  }
  return (
    <Frame
      {...props}
      src={`https://www.linkedin.com/embed/feed/update/urn:li:${postType}:${objectId}`}
      title="LinkedIn"
    />
  );
}

export default Linkedin;
