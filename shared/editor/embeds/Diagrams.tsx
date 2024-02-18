import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function Diagrams({ matches, ...props }: Props) {
  const { embed } = props;
  const embedUrl = matches[0];
  const params = new URL(embedUrl).searchParams;
  const titlePrefix = embed.settings?.url ? "Draw.io" : "Diagrams.net";
  const title = params.get("title")
    ? `${titlePrefix} (${params.get("title")})`
    : titlePrefix;

  return (
    <Frame
      {...props}
      src={props.attrs.href}
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

export default Diagrams;
