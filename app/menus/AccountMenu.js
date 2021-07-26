// @flow
import { observer } from "mobx-react";
import {
  SunIcon,
  MoonIcon,
  SettingsIcon,
  KeyboardIcon,
  NotepadIcon,
  EmailIcon,
  BugIcon,
} from "outline-icons";
import JournalIcon from "outline-icons/lib/components/JournalIcon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import {
  developers,
  changelog,
  githubIssuesUrl,
  mailToUrl,
  settings,
} from "shared/utils/routeHelpers";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import ContextMenu from "components/ContextMenu";
import Template, { filterTemplateItems } from "components/ContextMenu/Template";
import Flex from "components/Flex";
import Guide from "components/Guide";
import useBoolean from "hooks/useBoolean";
import usePrevious from "hooks/usePrevious";
import useStores from "hooks/useStores";

type Props = {|
  children: (props: any) => React.Node,
|};

function AccountMenu(props: Props) {
  const menu = useMenuState({
    placement: "bottom-start",
    modal: true,
  });
  const { auth, ui } = useStores();
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

  const AppearanceTitle = () => {
    return (
      <Flex align="center">
        <IconWrapper>
          {ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}{" "}
        </IconWrapper>
        {t("Appearance")}
      </Flex>
    );
  };
  const items = () =>
    filterTemplateItems([
      {
        title: t("Settings"),
        to: settings(),
        icon: <SettingsIcon />,
      },
      {
        title: t("Keyboard shortcuts"),
        onClick: handleKeyboardShortcutsOpen,
        icon: <KeyboardIcon />,
      },
      {
        title: t("API documentation"),
        href: developers(),
        icon: <JournalIcon />,
      },
      {
        type: "separator",
      },
      {
        title: t("Changelog"),
        href: changelog(),
        icon: <NotepadIcon />,
      },
      {
        title: t("Send us feedback"),
        href: mailToUrl(),
        icon: <EmailIcon />,
      },
      {
        title: t("Report a bug"),
        href: githubIssuesUrl(),
        icon: <BugIcon />,
      },
      {
        title: <AppearanceTitle />,
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
      {
        title: t("Log out"),
        onClick: auth.logout,
      },
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
        <Template {...menu} items={items()} />
      </ContextMenu>
    </>
  );
}

const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
  overflow: hidden;
  flex-shrink: 0;
`;

export default observer(AccountMenu);
