import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
  "^https?://calendar.google.com/calendar/embed\\?src=(.*)$"
);
type Props = {
  attrs: {
    href: string;
    matches: string[];
  };
};

export default class GoogleCalendar extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  
  render() {
    return (
      <Frame
        {...this.props}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ src: string; title: string; border: true; ... Remove this comment to see the full error message
        src={this.props.attrs.href}
        title="Google Calendar"
        border
      />
    );
  }
}
