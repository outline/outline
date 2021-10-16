// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import { actionToMenuItem } from "actions";
import { development } from "actions/definitions/debug";
import {
  navigateToSettings,
  openKeyboardShortcuts,
  openChangelog,
  openAPIDocumentation,
  openBugReportUrl,
  openFeedbackUrl,
} from "actions/definitions/navigation";
import { changeTheme } from "actions/definitions/settings";
import useCurrentTeam from "hooks/useCurrentTeam";
import usePrevious from "hooks/usePrevious";
import useSessions from "hooks/useSessions";
import useStores from "hooks/useStores";
import separator from "menus/separator";

type Props = {|
  children: (props: any) => React.Node,
|};

function AccountMenu(props: Props) {
  const [sessions] = useSessions();
  const menu = useMenuState({
    unstable_offset: [8, 0],
    placement: "bottom-start",
    modal: true,
  });
  const { auth, ui } = useStores();
  const { theme } = ui;
  const team = useCurrentTeam();
  const previousTheme = usePrevious(theme);
  const { t } = useTranslation();
  const [lastEvent, setEvent] = React.useState();

  React.useEffect(() => {
    if (theme !== previousTheme) {
      menu.hide();
    }
  }, [menu, theme, previousTheme]);

  const handleOpenMenu = React.useCallback((event) => {
    setEvent(event);
  }, []);

  const items = React.useMemo(() => {
    const otherSessions = sessions.filter(
      (session) => session.teamId !== team.id && session.url !== team.url
    );

    const context = {
      t,
      event: lastEvent,
      isCommandBar: false,
      isContextMenu: true,
    };

    return [
      actionToMenuItem(navigateToSettings, context),
      actionToMenuItem(openKeyboardShortcuts, context),
      actionToMenuItem(openAPIDocumentation, context),
      separator(),
      actionToMenuItem(openChangelog, context),
      actionToMenuItem(openFeedbackUrl, context),
      actionToMenuItem(openBugReportUrl, context),
      actionToMenuItem(development, context),
      actionToMenuItem(changeTheme, context),
      separator(),
      ...(otherSessions.length
        ? [
            {
              title: t("Switch team"),
              items: otherSessions.map((session) => ({
                title: session.name,
                icon: <Logo alt={session.name} src={session.logoUrl} />,
                href: session.url,
              })),
            },
          ]
        : []),
      {
        title: t("Log out"),
        onClick: auth.logout,
      },
    ];
  }, [auth.logout, team.id, team.url, sessions, t, lastEvent]);

  return (
    <>
      <MenuButton {...menu} onClick={handleOpenMenu}>
        {props.children}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Account")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

const Logo = styled("img")`
  border-radius: 2px;
  width: 24px;
  height: 24px;
`;

export default observer(AccountMenu);
