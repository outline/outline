import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Image";
import { EmbedProps as Props } from ".";

function Diagrams(props: Props) {
  const embedUrl = props.attrs.matches[0];
  const params = new URL(embedUrl).searchParams;
  const title = params.get("title")
    ? `Diagrams.net (${params.get("title")})`
    : "Diagrams.net";

  return (
    <Frame
      {...props}
      src={embedUrl}
      icon={
        <Image
          src="/images/diagrams.png"
          alt="Diagrams.net"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      title={title}
      border
    />
  );
}

Diagrams.ENABLED = [
  /^https:\/\/viewer\.diagrams\.net\/(?!proxy).*(title=\\w+)?/,
];

Diagrams.URL_PATH_REGEX = "/(?!proxy).*(title=\\\\w+)?";

export default Diagrams;
