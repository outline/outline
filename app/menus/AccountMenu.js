// @flow
import { observer } from "mobx-react";
// import { SunIcon, MoonIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import {
  developers,
  changelog,
  githubIssuesUrl,
  mailToUrl,
  settings,
} from "shared/utils/routeHelpers";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import Guide from "components/Guide";
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
  const { auth, ui, quickMenu } = useStores();
  const previousTheme = usePrevious(ui.theme);
  const { t } = useTranslation();
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = React.useState(
    false
  );

  React.useEffect(() => {
    if (ui.theme !== previousTheme) {
      menu.hide();
    }
  }, [menu, ui.theme, previousTheme]);

  const items = [
    {
      title: t("Settings"),
      to: settings(),
      visible: true,
    },
    {
      title: t("Keyboard shortcuts"),
      onClick: () => setKeyboardShortcutsOpen(true),
      visible: true,
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
      type: "separator",
    },
    {
      title: t("Appearance"),
      // icon: ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />,
      items: [
        {
          title: t("System"),
          selected: ui.theme === "system",
          onClick: () => ui.setTheme("system"),
        },
        {
          title: t("Light"),
          selected: ui.theme === "light",
          onClick: () => ui.setTheme("light"),
        },
        {
          title: t("Dark"),
          selected: ui.theme === "dark",
          onClick: () => ui.setTheme("dark"),
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

    // <MenuItem {...menu} as={AppearanceMenu} />
  ];

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
        onRequestClose={() => setKeyboardShortcutsOpen(false)}
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

export default observer(AccountMenu);
