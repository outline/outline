// @flow
import { observer } from "mobx-react";
import { MoonIcon, SunIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import {
  changelog,
  developers,
  githubIssuesUrl,
  mailToUrl,
  settings,
} from "shared/utils/routeHelpers";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import ContextMenu from "components/ContextMenu";
import Template, { filterTemplateItems } from "components/ContextMenu/Template";
import Flex from "components/Flex";
import Guide from "components/Guide";
import MenuIconWrapper from "components/MenuIconWrapper";
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
        <MenuIconWrapper>
          {ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}{" "}
        </MenuIconWrapper>
        {t("Appearance")}
      </Flex>
    );
  };
  const items = () =>
    filterTemplateItems([
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

export default observer(AccountMenu);
