// @flow
import { observer } from "mobx-react";
import { SunIcon, MoonIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
import MenuItem, { MenuAnchor } from "components/ContextMenu/MenuItem";
import Separator from "components/ContextMenu/Separator";
import Flex from "components/Flex";
import Guide from "components/Guide";
import usePrevious from "hooks/usePrevious";
import useStores from "hooks/useStores";

type Props = {|
  children: (props: any) => React.Node,
|};

const AppearanceMenu = React.forwardRef((props, ref) => {
  const { ui } = useStores();
  const { t } = useTranslation();
  const menu = useMenuState();

  return (
    <>
      <MenuButton ref={ref} {...menu} {...props} onClick={menu.show}>
        {(props) => (
          <MenuAnchor {...props}>
            <ChangeTheme justify="space-between">
              {t("Appearance")}
              {ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}
            </ChangeTheme>
          </MenuAnchor>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Appearance")}>
        <MenuItem
          {...menu}
          onClick={() => ui.setTheme("system")}
          selected={ui.theme === "system"}
        >
          {t("System")}
        </MenuItem>
        <MenuItem
          {...menu}
          onClick={() => ui.setTheme("light")}
          selected={ui.theme === "light"}
        >
          {t("Light")}
        </MenuItem>
        <MenuItem
          {...menu}
          onClick={() => ui.setTheme("dark")}
          selected={ui.theme === "dark"}
        >
          {t("Dark")}
        </MenuItem>
      </ContextMenu>
    </>
  );
});

function AccountMenu(props: Props) {
  const menu = useMenuState({
    placement: "bottom-start",
    modal: true,
  });
  const { auth, ui } = useStores();
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
        <MenuItem {...menu} as={Link} to={settings()}>
          {t("Settings")}
        </MenuItem>
        <MenuItem {...menu} onClick={() => setKeyboardShortcutsOpen(true)}>
          {t("Keyboard shortcuts")}
        </MenuItem>
        <MenuItem {...menu} href={developers()} target="_blank">
          {t("API documentation")}
        </MenuItem>
        <Separator {...menu} />
        <MenuItem {...menu} href={changelog()} target="_blank">
          {t("Changelog")}
        </MenuItem>
        <MenuItem {...menu} href={mailToUrl()} target="_blank">
          {t("Send us feedback")}
        </MenuItem>
        <MenuItem {...menu} href={githubIssuesUrl()} target="_blank">
          {t("Report a bug")}
        </MenuItem>
        <Separator {...menu} />
        <MenuItem {...menu} as={AppearanceMenu} />
        <Separator {...menu} />
        <MenuItem {...menu} onClick={auth.logout}>
          {t("Log out")}
        </MenuItem>
      </ContextMenu>
    </>
  );
}

const ChangeTheme = styled(Flex)`
  width: 100%;
`;

export default observer(AccountMenu);
