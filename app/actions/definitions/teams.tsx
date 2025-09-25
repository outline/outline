import { ArrowIcon, PlusIcon } from "outline-icons";
import styled from "styled-components";
import { stringToColor } from "@shared/utils/color";
import RootStore from "~/stores/RootStore";
import { LoginDialog } from "~/scenes/Login/components/LoginDialog";
import TeamNew from "~/scenes/TeamNew";
import TeamLogo from "~/components/TeamLogo";
import {
  createActionV2,
  createActionV2WithChildren,
  createExternalLinkActionV2,
} from "~/actions";
import { ActionContext, ExternalLinkActionV2 } from "~/types";
import Desktop from "~/utils/Desktop";
import { TeamSection } from "../sections";

export const switchTeamsList = ({ stores }: { stores: RootStore }) =>
  stores.auth.availableTeams?.map<ExternalLinkActionV2>((session) =>
    createExternalLinkActionV2({
      id: `switch-${session.id}`,
      name: session.name,
      analyticsName: "Switch workspace",
      section: TeamSection,
      keywords: "change switch workspace organization team",
      icon: (
        <StyledTeamLogo
          alt={session.name}
          model={{
            initial: session.name[0],
            avatarUrl: session.avatarUrl,
            id: session.id,
            color: stringToColor(session.id),
          }}
          size={24}
        />
      ),
      visible: ({ currentTeamId }: ActionContext) =>
        currentTeamId !== session.id,
      url: session.url,
      target: "_self",
    })
  ) ?? [];

export const switchTeam = createActionV2WithChildren({
  name: ({ t }) => t("Switch workspace"),
  placeholder: ({ t }) => t("Select a workspace"),
  analyticsName: "Switch workspace",
  keywords: "change switch workspace organization team",
  section: TeamSection,
  visible: ({ stores }) =>
    !!stores.auth.availableTeams && stores.auth.availableTeams?.length > 1,
  children: switchTeamsList,
});

export const createTeam = createActionV2({
  name: ({ t }) => `${t("New workspace")}…`,
  analyticsName: "New workspace",
  keywords: "create change switch workspace organization team",
  section: TeamSection,
  icon: <PlusIcon />,
  visible: ({ stores, currentTeamId }) =>
    stores.policies.abilities(currentTeamId ?? "").createTeam,
  perform: ({ t, event, stores }) => {
    event?.preventDefault();
    event?.stopPropagation();

    const { user } = stores.auth;
    if (user) {
      stores.dialogs.openModal({
        title: t("Create a workspace"),
        content: <TeamNew user={user} />,
      });
    }
  },
});

export const desktopLoginTeam = createActionV2({
  name: ({ t }) => t("Login to workspace"),
  analyticsName: "Login to workspace",
  keywords: "change switch workspace organization team",
  section: TeamSection,
  icon: <ArrowIcon />,
  visible: () => Desktop.isElectron(),
  perform: ({ t, event, stores }) => {
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: t("Login to workspace"),
      content: <LoginDialog />,
    });
  },
});

const StyledTeamLogo = styled(TeamLogo)`
  border-radius: 2px;
  border: 0;
`;

export const rootTeamActions = [switchTeam, createTeam, desktopLoginTeam];
