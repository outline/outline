import * as React from "react";
import styled from "styled-components";
import { createAction } from "~/actions";
import { loadSessionsFromCookie } from "~/hooks/useSessions";

export const changeTeam = createAction({
  name: ({ t }) => t("Switch team"),
  placeholder: ({ t }) => t("Select a team"),
  keywords: "switch workspace organization",
  section: "account",
  visible: ({ currentTeamId }) => {
    const sessions = loadSessionsFromCookie();
    const otherSessions = sessions.filter(
      (session) => session.teamId !== currentTeamId
    );
    return otherSessions.length > 0;
  },
  children: ({ currentTeamId }) => {
    const sessions = loadSessionsFromCookie();
    const otherSessions = sessions.filter((session) => {
      return session.teamId !== currentTeamId;
    });

    return otherSessions.map((session) => ({
      id: session.url,
      name: session.name,
      section: "account",
      icon: <Logo alt={session.name} src={session.logoUrl} />,
      perform: () => (window.location.href = session.url),
    }));
  },
});

const Logo = styled("img")`
  border-radius: 2px;
  width: 24px;
  height: 24px;
`;

export const rootTeamActions = [changeTeam];
