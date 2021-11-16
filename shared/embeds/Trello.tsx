import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = /^https:\/\/trello.com\/(c|b)\/([^/]*)(.*)?$/;
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class Trello extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const { matches } = this.props.attrs;
    const objectId = matches[2];

    if (matches[1] === "c") {
      return (
        <Frame
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ width: string; height: string; src: string... Remove this comment to see the full error message
          width="316px"
          height="158px"
          src={`https://trello.com/embed/card?id=${objectId}`}
          title={`Trello Card (${objectId})`}
        />
      );
    }

    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ width: string; height: string; src: string... Remove this comment to see the full error message
        width="248px"
        height="185px"
        src={`https://trello.com/embed/board?id=${objectId}`}
        title={`Trello Board (${objectId})`}
      />
    );
  }
}
