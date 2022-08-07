import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Image";
import { EmbedProps as Props } from ".";

function Grist(props: Props) {
  const { matches } = props.attrs;
  const sheetURL = matches[1];
  return (
    <Frame
      {...props}
      src={`${sheetURL}?embed=true`}
      icon={
        <Image
          src="/images/grist.png"
          alt="Grist Icon"
          width={16}
          height={16}
        />
      }
      title="Grist Spreadsheet"
      border
    />
  );
}

Grist.ENABLED = [
  new RegExp(
    "^(https?://[a-z.-]+\\.?getgrist\\.com/.*/p/[0-9]+)(\\?embed=true)?$"
  ),
];

export default Grist;
