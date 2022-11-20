import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleDataStudio(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href.replace("u/0", "embed").replace("/edit", "")}
      icon={
        <Image
          src="/images/google-datastudio.png"
          alt="Google Data Studio Icon"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      title="Google Data Studio"
      border
    />
  );
}

GoogleDataStudio.ENABLED = [
  new RegExp(
    "^https?://datastudio\\.google\\.com/(embed|u/0)/reporting/(.*)/page/(.*)(/edit)?$"
  ),
];

export default GoogleDataStudio;
