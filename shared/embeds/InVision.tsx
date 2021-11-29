import * as React from "react";
import ImageZoom from "react-medium-image-zoom";
import Frame from "./components/Frame";

const IFRAME_REGEX = /^https:\/\/(invis\.io\/.*)|(projects\.invisionapp\.com\/share\/.*)$/;
const IMAGE_REGEX = /^https:\/\/(opal\.invisionapp\.com\/static-signed\/live-embed\/.*)$/;
type Props = {
  isSelected: boolean;
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class InVision extends React.Component<Props> {
  static ENABLED = [IFRAME_REGEX, IMAGE_REGEX];

  render() {
    if (IMAGE_REGEX.test(this.props.attrs.href)) {
      return (
        <ImageZoom
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
          className={this.props.isSelected ? "ProseMirror-selectednode" : ""}
          image={{
            src: this.props.attrs.href,
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

    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; isSelected: bo... Remove this comment to see the full error message
        src={this.props.attrs.href}
        title="InVision Embed"
      />
    );
  }
}
