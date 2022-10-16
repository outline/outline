import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function GoogleCalendar(props: Props) {
  return (
    <Frame {...props} src={props.attrs.href} title="Google Calendar" border />
  );
}

GoogleCalendar.ENABLED = [
  new RegExp("^https?://calendar\\.google\\.com/calendar/embed\\?src=(.*)$"),
];

export default GoogleCalendar;
