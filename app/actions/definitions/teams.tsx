import { PlusIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import TeamNew from "~/scenes/TeamNew";
import { createAction } from "~/actions";
import { loadSessionsFromCookie } from "~/hooks/useSessions";

export const switchTeamList = getSessions().map((session) => {
  return createAction({
    name: session.name,
    section: "Switch Team",
    keywords: "change switch workspace organization team",
    icon: () => <Logo alt={session.name} src={session.logoUrl} />,
    visible: ({ currentTeamId }) => currentTeamId !== session.teamId,
    perform: () => (window.location.href = session.url),
  });
});

const switchTeam = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Teams") : t("Switch team"),
  placeholder: ({ t }) => t("Select a team"),
  keywords: "change switch workspace organization team",
  section: "Team",
  visible: ({ currentTeamId }) =>
    getSessions({ exclude: currentTeamId }).length > 0,
  children: switchTeamList,
});

export const createTeam = createAction({
  name: ({ t }) => `${t("New team")}…`,
  keywords: "create change switch workspace organization team",
  section: "New Team",
  icon: <PlusIcon />,
  visible: ({ stores, currentTeamId }) => {
    return stores.policies.abilities(currentTeamId ?? "").createTeam;
  },
  perform: ({ t, event, stores }) => {
    event?.preventDefault();
    event?.stopPropagation();
    const { user } = stores.auth;
    user &&
      stores.dialogs.openModal({
        title: t("Create a team"),
        content: <TeamNew user={user} />,
      });
  },
});

function getSessions(params?: { exclude?: string }) {
  const sessions = loadSessionsFromCookie();
  const otherSessions = sessions.filter(
    (session) => session.teamId !== params?.exclude
  );
  return otherSessions;
}

const Logo = styled("img")`
  border-radius: 2px;
  width: 24px;
  height: 24px;
`;

export const rootTeamActions = [switchTeam, createTeam];
