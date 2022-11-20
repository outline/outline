import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleDrawings(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href.replace("/edit", "/preview")}
      icon={
        <Image
          src="/images/google-drawings.png"
          alt="Google Drawings"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href.replace("/preview", "/edit")}
      title="Google Drawings"
      border
    />
  );
}

GoogleDrawings.ENABLED = [
  new RegExp(
    "^https://docs\\.google\\.com/drawings/d/(.*)/(edit|preview)(.*)$"
  ),
];

export default GoogleDrawings;
