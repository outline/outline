import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleLookerStudio(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href.replace("u/0", "embed").replace("/edit", "")}
      icon={
        <Image
          src="/images/google-lookerstudio.png"
          alt="Google Looker Studio Icon"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      title="Google Looker Studio"
      border
    />
  );
}

GoogleLookerStudio.ENABLED = [
  new RegExp(
    "^https?://(lookerstudio|datastudio)\\.google\\.com/(embed|u/0)/reporting/(.*)/page/(.*)(/edit)?$"
  ),
];

export default GoogleLookerStudio;
