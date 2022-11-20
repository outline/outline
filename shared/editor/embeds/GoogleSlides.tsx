import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleSlides(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href
        .replace("/edit", "/preview")
        .replace("/pub", "/embed")}
      icon={
        <Image
          src="/images/google-slides.png"
          alt="Google Slides Icon"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      title="Google Slides"
      border
    />
  );
}

GoogleSlides.ENABLED = [
  new RegExp("^https?://docs\\.google\\.com/presentation/d/(.*)$"),
];

export default GoogleSlides;
