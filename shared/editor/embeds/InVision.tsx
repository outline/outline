import * as React from "react";
import ImageZoom from "react-medium-image-zoom";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const IFRAME_REGEX = /^https:\/\/(invis\.io\/.*)|(projects\.invisionapp\.com\/share\/.*)$/;
const IMAGE_REGEX = /^https:\/\/(opal\.invisionapp\.com\/static-signed\/live-embed\/.*)$/;

function InVision(props: Props) {
  if (IMAGE_REGEX.test(props.attrs.href)) {
    return (
      <ImageZoom
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        className={props.isSelected ? "ProseMirror-selectednode" : ""}
        image={{
          src: props.attrs.href,
          alt: "InVision Embed",
          style: {
            maxWidth: "100%",
            maxHeight: "75vh",
          },
        }}
        shouldRespectMaxDimension
      />
    );
  }

  return <Frame {...props} src={props.attrs.href} title="InVision Embed" />;
}

InVision.ENABLED = [IFRAME_REGEX, IMAGE_REGEX];

export default InVision;
