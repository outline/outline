import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("https?://cawemo.com/(?:share|embed)/(.*)$");
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class Cawemo extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  
  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; border: true; ... Remove this comment to see the full error message
        src={`https://cawemo.com/embed/${shareId}`}
        title={"Cawemo Embed"}
        border
        allowfullscreen
      />
    );
  }
}
