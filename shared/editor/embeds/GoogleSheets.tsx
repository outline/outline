import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleSheets(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href.replace("/edit", "/preview")}
      icon={
        <Image
          src="/images/google-sheets.png"
          alt="Google Sheets Icon"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      title="Google Sheets"
      border
    />
  );
}

GoogleSheets.ENABLED = [
  new RegExp("^https?://docs\\.google\\.com/spreadsheets/d/(.*)$"),
];

export default GoogleSheets;
