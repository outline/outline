// @flow
import { observer } from "mobx-react";
// import { SunIcon, MoonIcon } from "outline-icons";
import { MoonIcon, SunIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import {
  changelog,
  developers,
  githubIssuesUrl,
  mailToUrl,
  settings,
} from "shared/utils/routeHelpers";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import Guide from "components/Guide";
import useBoolean from "hooks/useBoolean";
import useCurrentTeam from "hooks/useCurrentTeam";
import usePrevious from "hooks/usePrevious";
import useSessions from "hooks/useSessions";
import useStores from "hooks/useStores";

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
  const { auth, ui, quickMenu } = useStores();
  const previousTheme = usePrevious(ui.theme);
  const { theme, resolvedTheme } = ui;
  const team = useCurrentTeam();
  const { t } = useTranslation();
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

  const items = React.useMemo(() => {
    const otherSessions = sessions.filter(
      (session) => session.teamId !== team.id && session.url !== team.url
    );

    return [
      {
        title: t("Settings"),
        to: settings(),
      },
      {
        title: t("Keyboard shortcuts"),
        onClick: handleKeyboardShortcutsOpen,
      },
      {
        title: t("API documentation"),
        href: developers(),
      },
      {
        type: "separator",
      },
      {
        title: t("Changelog"),
        href: changelog(),
      },
      {
        title: t("Send us feedback"),
        href: mailToUrl(),
      },
      {
        title: t("Report a bug"),
        href: githubIssuesUrl(),
      },
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
    resolvedTheme,
    theme,
    t,
    ui,
  ]);

  React.useEffect(() => {
    quickMenu.addContext({
      id: "account",
      items,
      title: t("Account"),
    });

    return () => quickMenu.removeContext("account");
  }, [quickMenu, items, t]);

  return (
    <>
      <Guide
        isOpen={keyboardShortcutsOpen}
        onRequestClose={handleKeyboardShortcutsClose}
        title={t("Keyboard shortcuts")}
      >
        <KeyboardShortcuts />
      </Guide>
      <MenuButton {...menu}>{props.children}</MenuButton>
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
