import * as React from "react";
import Frame from "./components/Frame";

type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class Abstract extends React.Component<Props> {
  static ENABLED = [
    new RegExp("https?://share.(?:go)?abstract.com/(.*)$"),
    new RegExp("https?://app.(?:go)?abstract.com/(?:share|embed)/(.*)$"),
  ];

  
  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; attrs: { href:... Remove this comment to see the full error message
        src={`https://app.goabstract.com/embed/${shareId}`}
        title={`Abstract (${shareId})`}
      />
    );
  }
}
