import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Image";
import { EmbedProps as Props } from ".";

function Castopod(props: Props) {
  const { embed } = props;
  const embedUrl = props.attrs.matches[0];
  const params = new URL(embedUrl).searchParams;
  const titlePrefix = embed.settings?.url ? "Castopod" : "Castopod.org";
  const title = params.get("title")
    ? `${titlePrefix} (${params.get("title")})`
    : titlePrefix;

  const height;
  height = 110;

  return (
    <Frame
      {...props}
      src={embedUrl}
      width="100%"
      height={`${height}px`}
      icon={
        <Image
          src="/images/castopod.png"
          alt="Castopod.org"
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

Castopod.ENABLED = [/^https:\/\/castopod\.org\/\@podcast\/.*/];

Castopod.URL_PATH_REGEX = /\/\@podcast\/.*/;

export default Castopod;
