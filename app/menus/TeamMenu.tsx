import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  navigateToWorkspaceSettings,
  logout,
} from "~/actions/definitions/navigation";
import {
  createTeam,
  switchTeamsList,
  desktopLoginTeam,
} from "~/actions/definitions/teams";
import useActionContext from "~/hooks/useActionContext";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { ActionV2Separator } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  children?: React.ReactNode;
};

const TeamMenu: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const context = useActionContext({ isMenu: true });

  // NOTE: it's useful to memoize on the team id and session because the action
  // menu is not cached at all.
  const actions = React.useMemo(
    () => [
      ...switchTeamsList(context),
      createTeam,
      desktopLoginTeam,
      ActionV2Separator,
      navigateToWorkspaceSettings,
      logout,
    ],
    [context]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} align="start" ariaLabel={t("Account")}>
      {children}
    </DropdownMenu>
  );
};

export default observer(TeamMenu);
