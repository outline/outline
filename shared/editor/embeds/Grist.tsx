import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function Grist(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href.replace(/(\?embed=true)?$/, "?embed=true")}
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

Grist.ENABLED = [new RegExp("^https?://([a-z.-]+\\.)?getgrist\\.com/(.+)$")];

Grist.URL_PATH_REGEX = /(.+)/;

export default Grist;
