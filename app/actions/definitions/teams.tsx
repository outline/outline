import { PlusIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { createAction } from "~/actions";
import { loadSessionsFromCookie } from "~/hooks/useSessions";

export const changeTeam = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Switch team") : t("Switch team"),
  placeholder: ({ t }) => t("Select a team"),
  keywords: "change workspace organization",
  section: "Team",
  visible: ({ currentTeamId }) => {
    return getOtherSessions(currentTeamId).length > 0;
  },
  children: ({ currentTeamId }) => {
    return [
      ...getOtherSessions(currentTeamId).map((session) => ({
        id: session.url,
        name: session.name,
        section: "Team",
        icon: <Logo alt={session.name} src={session.logoUrl} />,
        perform: () => (window.location.href = session.url),
      })),
      createTeam,
    ];
  },
});

const createTeam = createAction({
  name: ({ t }) => t("New team..."),
  keywords: "change workspace organization",
  section: "Team",
  visible: ({ currentTeamId }) => {
    return getOtherSessions(currentTeamId).length > 0;
  },
  icon: <PlusIcon />,
  perform: ({ stores }) => alert(stores.auth.user?.name),
});

function getOtherSessions(currentTeamId = "") {
  const sessions = loadSessionsFromCookie();
  const otherSessions = sessions.filter(
    (session) => session.teamId !== currentTeamId
  );
  return otherSessions;
}

const Logo = styled("img")`
  border-radius: 2px;
  width: 24px;
  height: 24px;
`;

export const rootTeamActions = [changeTeam, createTeam];
