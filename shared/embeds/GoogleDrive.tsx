import * as React from "react";
import Frame from "./components/Frame";
import Image from "./components/Image";

const URL_REGEX = new RegExp("^https?://drive.google.com/file/d/(.*)$");
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class GoogleDrive extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  
  render() {
    return (
      <Frame
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; icon: Element; title: string;... Remove this comment to see the full error message
        src={this.props.attrs.href.replace("/view", "/preview")}
        icon={
          <Image
            src="/images/google-drive.png"
            alt="Google Drive Icon"
            width={16}
            height={16}
          />
        }
        title="Google Drive"
        canonicalUrl={this.props.attrs.href}
        border
      />
    );
  }
}
