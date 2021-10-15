// @flow
import { observer } from "mobx-react";
import { MoonIcon, SunIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import { githubIssuesUrl, mailToUrl } from "shared/utils/routeHelpers";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import Guide from "components/Guide";
import { actionToMenuItem } from "actions";
import {
  navigateToSettings,
  openKeyboardShortcuts,
  openChangelog,
  openAPIDocumentation,
} from "actions/definitions/navigation";
import env from "env";
import useBoolean from "hooks/useBoolean";
import useCurrentTeam from "hooks/useCurrentTeam";
import usePrevious from "hooks/usePrevious";
import useSessions from "hooks/useSessions";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
import { deleteAllDatabases } from "utils/developer";

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
  const { showToast } = useToasts();
  const { auth, ui } = useStores();
  const { theme, resolvedTheme } = ui;
  const team = useCurrentTeam();
  const previousTheme = usePrevious(theme);
  const { t } = useTranslation();
  const [includeAlt, setIncludeAlt] = React.useState(false);
  const [
    keyboardShortcutsOpen,
    handleKeyboardShortcutsOpen,
    handleKeyboardShortcutsClose,
  ] = useBoolean();

  React.useEffect(() => {
    if (theme !== previousTheme) {
      menu.hide();
    }
  }, [menu, theme, previousTheme]);

  const handleDeleteAllDatabases = React.useCallback(async () => {
    await deleteAllDatabases();
    showToast("IndexedDB cache deleted");
    menu.hide();
  }, [showToast, menu]);

  const handleOpenMenu = React.useCallback((event) => {
    setIncludeAlt(event.altKey);
  }, []);

  const items = React.useMemo(() => {
    const otherSessions = sessions.filter(
      (session) => session.teamId !== team.id && session.url !== team.url
    );

    return [
      actionToMenuItem(navigateToSettings, { t }),
      actionToMenuItem(openKeyboardShortcuts, { t }),
      actionToMenuItem(openAPIDocumentation, { t }),
      {
        type: "separator",
      },
      actionToMenuItem(openChangelog, { t }),
      {
        title: t("Send us feedback"),
        href: mailToUrl(),
      },
      {
        title: t("Report a bug"),
        href: githubIssuesUrl(),
      },
      ...(includeAlt || env.ENVIRONMENT === "development"
        ? [
            {
              title: t("Development"),
              items: [
                {
                  title: "Delete IndexedDB cache",
                  icon: <TrashIcon />,
                  onClick: handleDeleteAllDatabases,
                },
              ],
            },
          ]
        : []),
      {
        title: t("Appearance"),
        icon: resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />,
        items: [
          {
            title: t("System"),
            onClick: () => ui.setTheme("system"),
            selected: theme === "system",
          },
          {
            title: t("Light"),
            onClick: () => ui.setTheme("light"),
            selected: theme === "light",
          },
          {
            title: t("Dark"),
            onClick: () => ui.setTheme("dark"),
            selected: theme === "dark",
          },
        ],
      },
      {
        type: "separator",
      },
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
  }, [
    auth.logout,
    team.id,
    team.url,
    sessions,
    handleKeyboardShortcutsOpen,
    handleDeleteAllDatabases,
    resolvedTheme,
    includeAlt,
    theme,
    t,
    ui,
  ]);

  return (
    <>
      <Guide
        isOpen={keyboardShortcutsOpen}
        onRequestClose={handleKeyboardShortcutsClose}
        title={t("Keyboard shortcuts")}
      >
        <KeyboardShortcuts />
      </Guide>
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
