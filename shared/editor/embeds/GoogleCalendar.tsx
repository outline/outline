import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https?://calendar.google.com/calendar/embed\\?src=(.*)$"
);

export default class GoogleCalendar extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  render() {
    return (
      <Frame
        {...this.props}
        src={this.props.attrs.href}
        title="Google Calendar"
        border
      />
    );
  }
}
