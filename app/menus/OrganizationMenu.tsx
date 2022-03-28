import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import { createAction } from "~/actions";
import { navigateToSettings, logout } from "~/actions/definitions/navigation";
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

  const actions = React.useMemo(() => {
    const otherSessions = sessions.filter(
      (session) => session.teamId !== team.id && session.url !== team.url
    );

    return [
      navigateToSettings,
      separator(),
      ...(otherSessions.length
        ? [
            createAction({
              name: t("Switch team"),
              section: "account",
              children: otherSessions.map((session) => ({
                id: session.url,
                name: session.name,
                section: "account",
                icon: <Logo alt={session.name} src={session.logoUrl} />,
                perform: () => (window.location.href = session.url),
              })),
            }),
          ]
        : []),
      logout,
    ];
  }, [team.id, team.url, sessions, t]);

  return (
    <>
      <MenuButton {...menu}>{children}</MenuButton>
      <ContextMenu {...menu} aria-label={t("Account")}>
        <Template {...menu} items={undefined} actions={actions} />
      </ContextMenu>
    </>
  );
};

const Logo = styled("img")`
  border-radius: 2px;
  width: 24px;
  height: 24px;
`;

export default observer(OrganizationMenu);
