import * as React from "react";
import Frame from "../components/Frame";
import { ImageZoom } from "../components/ImageZoom";
import { EmbedProps as Props } from ".";

function InVision({ matches, ...props }: Props) {
  if (/opal\.invisionapp\.com/.test(props.attrs.href)) {
    return (
      <div className={props.isSelected ? "ProseMirror-selectednode" : ""}>
        <ImageZoom>
          <img
            src={props.attrs.href}
            alt="InVision Embed"
            style={{
              maxWidth: "100%",
              maxHeight: "75vh",
            }}
          />
        </ImageZoom>
      </div>
    );
  }

  return <Frame {...props} src={props.attrs.href} title="InVision Embed" />;
}

export default InVision;
