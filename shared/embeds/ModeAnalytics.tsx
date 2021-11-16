import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https://([w.-]+.)?modeanalytics.com/(.*)/reports/(.*)$"
);
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class ModeAnalytics extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    // Allow users to paste embed or standard urls and handle them the same
    const normalizedUrl = this.props.attrs.href.replace(/\/embed$/, "");
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; attrs: { href:... Remove this comment to see the full error message
        src={`${normalizedUrl}/embed`}
        title="Mode Analytics Embed"
      />
    );
  }
}
