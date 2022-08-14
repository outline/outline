import { PlusIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import TeamNew from "~/scenes/TeamNew";
import { createAction } from "~/actions";
import { loadSessionsFromCookie } from "~/hooks/useSessions";

export const changeTeam = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Teams") : t("Switch team"),
  placeholder: ({ t }) => t("Select a team"),
  keywords: "change workspace organization",
  section: "Team",
  visible: ({ stores, currentTeamId, isContextMenu }) => {
    const canCreate = stores.policies.abilities(currentTeamId ?? "").create;
    return (
      (isContextMenu && canCreate) || getOtherSessions(currentTeamId).length > 0
    );
  },
  children: ({ currentTeamId, isContextMenu }) => {
    return [
      ...getOtherSessions(currentTeamId).map((session) => ({
        id: session.url,
        name: session.name,
        section: "Team",
        icon: <Logo alt={session.name} src={session.logoUrl} />,
        perform: () => (window.location.href = session.url),
      })),
      ...(isContextMenu ? [createTeam] : []),
    ];
  },
});

const createTeam = createAction({
  name: ({ t }) => t("New team..."),
  keywords: "change switch create workspace organization",
  section: "Team",
  icon: <PlusIcon />,
  visible: ({ stores, currentTeamId }) => {
    return stores.policies.abilities(currentTeamId ?? "").create;
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
