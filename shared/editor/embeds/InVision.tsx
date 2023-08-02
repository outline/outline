import * as React from "react";
import Frame from "../components/Frame";
import ImageZoom from "../components/ImageZoom";
import { EmbedProps as Props } from ".";

const IFRAME_REGEX =
  /^https:\/\/(invis\.io\/.*)|(projects\.invisionapp\.com\/share\/.*)$/;
const IMAGE_REGEX =
  /^https:\/\/(opal\.invisionapp\.com\/static-signed\/live-embed\/.*)$/;

function InVision(props: Props) {
  if (IMAGE_REGEX.test(props.attrs.href)) {
    return (
      <div className={props.isSelected ? "ProseMirror-selectednode" : ""}>
        <ImageZoom zoomMargin={24}>
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

InVision.ENABLED = [IFRAME_REGEX, IMAGE_REGEX];

export default InVision;
