import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleDrive(props: Props) {
  return (
    <Frame
      src={props.attrs.href.replace("/view", "/preview")}
      icon={
        <Image
          src="/images/google-drive.png"
          alt="Google Drive Icon"
          width={16}
          height={16}
        />
      }
      title="Google Drive"
      canonicalUrl={props.attrs.href}
      border
    />
  );
}

GoogleDrive.ENABLED = [
  new RegExp("^https?://drive\\.google\\.com/file/d/(.*)$"),
];

export default GoogleDrive;
