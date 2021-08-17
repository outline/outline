// @flow
import { observer } from "mobx-react";
import { MoonIcon, SunIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import { getCookie } from "tiny-cookie";
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
import useStores from "hooks/useStores";

type Session = {|
  url: string,
  logoUrl: string,
  name: string,
  teamId: string,
|};

function getSessions(): Session[] {
  const sessions = JSON.parse(getCookie("sessions") || "{}");

  return Object.keys(sessions).map((teamId) => ({
    teamId,
    ...sessions[teamId],
  }));
}

type Props = {|
  children: (props: any) => React.Node,
|};

function AccountMenu(props: Props) {
  const [sessions] = React.useState(getSessions);
  const menu = useMenuState({
    unstable_offset: [8, 0],
    placement: "bottom-start",
    modal: true,
  });
  const { auth, ui } = useStores();
  const team = useCurrentTeam();
  const previousTheme = usePrevious(ui.theme);
  const { t } = useTranslation();
  const [
    keyboardShortcutsOpen,
    handleKeyboardShortcutsOpen,
    handleKeyboardShortcutsClose,
  ] = useBoolean();

  React.useEffect(() => {
    if (ui.theme !== previousTheme) {
      menu.hide();
    }
  }, [menu, ui.theme, previousTheme]);

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
        icon: ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />,
        items: [
          {
            title: t("System"),
            onClick: () => ui.setTheme("system"),
            selected: ui.theme === "system",
          },
          {
            title: t("Light"),
            onClick: () => ui.setTheme("light"),
            selected: ui.theme === "light",
          },
          {
            title: t("Dark"),
            onClick: () => ui.setTheme("dark"),
            selected: ui.theme === "dark",
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
