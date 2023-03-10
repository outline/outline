import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleDocs(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href.replace("/edit", "/preview")}
      icon={
        <Image
          src="/images/google-docs.png"
          alt="Google Docs Icon"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      title="Google Docs"
      border
    />
  );
}

GoogleDocs.ENABLED = [
  new RegExp("^https?://docs\\.google\\.com/document/(.*)$"),
];

export default GoogleDocs;
