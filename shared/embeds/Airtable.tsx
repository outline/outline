import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("https://airtable.com/(?:embed/)?(shr.*)$");
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class Airtable extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  
  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; border: true; ... Remove this comment to see the full error message
        src={`https://airtable.com/embed/${shareId}`}
        title={`Airtable (${shareId})`}
        border
      />
    );
  }
}
