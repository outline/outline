import { PlusIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { stringToColor } from "@shared/utils/color";
import TeamNew from "~/scenes/TeamNew";
import TeamLogo from "~/components/TeamLogo";
import { createAction } from "~/actions";
import { loadSessionsFromCookie } from "~/hooks/useSessions";
import { TeamSection } from "../sections";

export const switchTeamList = getSessions().map((session) => {
  return createAction({
    name: session.name,
    section: TeamSection,
    keywords: "change switch workspace organization team",
    icon: () => (
      <StyledTeamLogo
        alt={session.name}
        model={{
          initial: session.name[0],
          avatarUrl: session.logoUrl,
          id: session.teamId,
          color: stringToColor(session.teamId),
        }}
        size={24}
      />
    ),
    visible: ({ currentTeamId }) => currentTeamId !== session.teamId,
    perform: () => (window.location.href = session.url),
  });
});

const switchTeam = createAction({
  name: ({ t }) => t("Switch workspace"),
  placeholder: ({ t }) => t("Select a workspace"),
  keywords: "change switch workspace organization team",
  section: TeamSection,
  visible: ({ currentTeamId }) =>
    getSessions({ exclude: currentTeamId }).length > 0,
  children: switchTeamList,
});

export const createTeam = createAction({
  name: ({ t }) => `${t("New workspace")}…`,
  keywords: "create change switch workspace organization team",
  section: TeamSection,
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
        title: t("Create a workspace"),
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

const StyledTeamLogo = styled(TeamLogo)`
  border-radius: 2px;
  border: 0;
`;

export const rootTeamActions = [switchTeam, createTeam];
