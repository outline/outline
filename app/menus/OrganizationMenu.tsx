import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import { navigateToSettings, logout } from "~/actions/definitions/navigation";
import { changeTeam } from "~/actions/definitions/teams";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePrevious from "~/hooks/usePrevious";
import useSessions from "~/hooks/useSessions";
import useStores from "~/hooks/useStores";
import separator from "~/menus/separator";

const OrganizationMenu: React.FC = ({ children }) => {
  const [sessions] = useSessions();
  const menu = useMenuState({
    unstable_offset: [4, -4],
    placement: "bottom-start",
    modal: true,
  });
  const { ui } = useStores();
  const { theme } = ui;
  const team = useCurrentTeam();
  const previousTheme = usePrevious(theme);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (theme !== previousTheme) {
      menu.hide();
    }
  }, [menu, theme, previousTheme]);

  // NOTE: it's useful to memoize on the team id and session because the action
  // menu is not cached at all.
  const actions = React.useMemo(() => {
    return [navigateToSettings, separator(), changeTeam, logout];
  }, [team.id, sessions]);

  return (
    <>
      <MenuButton {...menu}>{children}</MenuButton>
      <ContextMenu {...menu} aria-label={t("Account")}>
        <Template {...menu} items={undefined} actions={actions} />
      </ContextMenu>
    </>
  );
};

export default observer(OrganizationMenu);
