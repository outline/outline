import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function Kroki(props: Props) {
  const embedUrl = props.attrs.matches[0];
  const params = new URL(embedUrl).pathname.split("/");
  const titlePrefix = new URL(embedUrl).hostname;
  const imgGiagram = params[1];
  const imgType = params[2];
  const title = `${titlePrefix} (${imgGiagram}.${imgType})`;

  return (
    <Frame
      {...props}
      src={embedUrl}
      icon={
        <Image src="/images/kroki.png" alt="Kroki.io" width={16} height={16} />
      }
      canonicalUrl={props.attrs.href}
      title={title}
      width="100%"
      scrolling="auto"
      border
    />
  );
}

// Kroki.ENABLED = [new RegExp("https?://kroki.io/(.*)/(.*)/(.*)")];

Kroki.ENABLED = [/^https:\/\/kroki\.io\/[a-zA-Z]+\/[a-zA-Z]+\/.*/];

Kroki.URL_PATH_REGEX = /\/[a-zA-Z]+\/[a-zA-Z]+\/.*/;

export default Kroki;
