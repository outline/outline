import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Dropbox({ matches, ...props }: Props) {
  // "fi" = file
  // "fo" = folder
  // Files need more vertical space to be readable
  const embedHeight = matches[3].split("/")[0] === "fi" ? "550px" : "350px";

  // Wrap inside an iframe to isolate external script and losened CSP
  return (
    <Frame
      src={`/embeds/dropbox?url=${encodeURIComponent(props.attrs.href)}`}
      className={props.isSelected ? "ProseMirror-selectednode" : ""}
      width="100%"
      height={embedHeight}
      title="Dropbox"
    />
  );
}

export default Dropbox;
