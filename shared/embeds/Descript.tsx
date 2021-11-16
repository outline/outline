import * as React from "react";
import Frame from "./components/Frame";

type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class Descript extends React.Component<Props> {
  static ENABLED = [new RegExp("https?://share.descript.com/view/(\\w+)$")];

  
  render() {
    const { matches } = this.props.attrs;
    const shareId = matches[1];
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; width: string;... Remove this comment to see the full error message
        src={`https://share.descript.com/embed/${shareId}`}
        title={`Descript (${shareId})`}
        width="400px"
      />
    );
  }
}
