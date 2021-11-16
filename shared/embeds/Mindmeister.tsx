import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https://([w.-]+.)?(mindmeister.com|mm.tt)(/maps/public_map_shell)?/(\\d+)(\\?t=.*)?(/.*)?$"
);
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class Mindmeister extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    const chartId =
      this.props.attrs.matches[4] +
      (this.props.attrs.matches[5] || "") +
      (this.props.attrs.matches[6] || "");
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; border: true; ... Remove this comment to see the full error message
        src={`https://www.mindmeister.com/maps/public_map_shell/${chartId}`}
        title="Mindmeister Embed"
        border
      />
    );
  }
}
