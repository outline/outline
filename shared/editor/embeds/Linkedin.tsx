import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Linkedin(props: Props) {
  const { matches } = props.attrs;
  const regex = /(\d+)/gm;
  let m;
  let code;
  while ((m = regex.exec(matches[0])) !== null) {
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    m.forEach((match) => {
      if (match.length > 3) {
        code = match;
      }
    });
  }
  const source = code;
  const regexUgcPost = /ugcPost-(\d+)/;
  const match = matches[0].match(regexUgcPost);

  if (match && match[1]) {
    return (
      <Frame
        {...props}
        src={`https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:${source}`}
        title="Linkedin"
      />
    );
  }
  return (
    <Frame
      {...props}
      src={`https://www.linkedin.com/embed/feed/update/urn:li:activity:${source}`}
      title="Linkedin"
    />
  );
}

Linkedin.ENABLED = [new RegExp("^https://www.linkedin.com/posts/?(.*)$")];

export default Linkedin;
