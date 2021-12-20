import * as React from "react";
import { getCookie } from "tiny-cookie";

type Session = {
  url: string;
  logoUrl: string;
  name: string;
  teamId: string;
};

function loadSessionsFromCookie(): Session[] {
  const sessions = JSON.parse(getCookie("sessions") || "{}");
  return Object.keys(sessions).map((teamId) => ({
    teamId,
    ...sessions[teamId],
  }));
}

export default function useSessions(): [Session[], () => void] {
  const [sessions, setSessions] = React.useState(loadSessionsFromCookie);
  const reload = React.useCallback(() => {
    setSessions(loadSessionsFromCookie());
  }, []);
  return [sessions, reload];
}
