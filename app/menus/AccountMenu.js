// @flow
import { observer } from "mobx-react";
import { SunIcon, MoonIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMenuState, MenuButton, MenuSeparator } from "reakit/Menu";
import styled from "styled-components";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import ContextMenu from "components/ContextMenu";
import { DropdownMenuItem, DropdownAnchor } from "components/DropdownMenu";
import Flex from "components/Flex";
import Modal from "components/Modal";
import {
  developers,
  changelog,
  githubIssuesUrl,
  mailToUrl,
  settings,
} from "../../shared/utils/routeHelpers";
import useStores from "hooks/useStores";

type Props = {
  children: (props: any) => React.Node,
};

const AppearanceMenu = React.forwardRef((props, ref) => {
  const { ui } = useStores();
  const { t } = useTranslation();
  const menu = useMenuState();

  return (
    <>
      <MenuButton ref={ref} {...menu} {...props}>
        {(props) => (
          <DropdownAnchor {...props}>
            <ChangeTheme justify="space-between">
              {t("Appearance")}
              {ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}
            </ChangeTheme>
          </DropdownAnchor>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Appearance")}>
        <DropdownMenuItem
          {...menu}
          href="#"
          onClick={() => ui.setTheme("system")}
          selected={ui.theme === "system"}
        >
          {t("System")}
        </DropdownMenuItem>
        <DropdownMenuItem
          {...menu}
          href="#"
          onClick={() => ui.setTheme("light")}
          selected={ui.theme === "light"}
        >
          {t("Light")}
        </DropdownMenuItem>
        <DropdownMenuItem
          {...menu}
          href="#"
          onClick={() => ui.setTheme("dark")}
          selected={ui.theme === "dark"}
        >
          {t("Dark")}
        </DropdownMenuItem>
      </ContextMenu>
    </>
  );
});

function AccountMenu(props: Props) {
  const menu = useMenuState({
    placement: "bottom-start",
  });
  const { auth } = useStores();
  const { t } = useTranslation();
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = React.useState(
    false
  );

  const handleLogout = React.useCallback(() => {
    auth.logout();
  }, [auth]);

  return (
    <>
      <Modal
        isOpen={keyboardShortcutsOpen}
        onRequestClose={() => setKeyboardShortcutsOpen(false)}
        title={t("Keyboard shortcuts")}
      >
        <KeyboardShortcuts />
      </Modal>
      <MenuButton {...menu}>{props.children}</MenuButton>
      <ContextMenu {...menu} aria-label={t("Account")}>
        <DropdownMenuItem {...menu} as={Link} to={settings()}>
          {t("Settings")}
        </DropdownMenuItem>
        <DropdownMenuItem
          {...menu}
          onClick={() => setKeyboardShortcutsOpen(true)}
        >
          {t("Keyboard shortcuts")}
        </DropdownMenuItem>
        <DropdownMenuItem {...menu} href={developers()} target="_blank">
          {t("API documentation")}
        </DropdownMenuItem>
        <MenuSeparator as="hr" {...menu} />
        <DropdownMenuItem {...menu} href={changelog()} target="_blank">
          {t("Changelog")}
        </DropdownMenuItem>
        <DropdownMenuItem {...menu} href={mailToUrl()} target="_blank">
          {t("Send us feedback")}
        </DropdownMenuItem>
        <DropdownMenuItem {...menu} href={githubIssuesUrl()} target="_blank">
          {t("Report a bug")}
        </DropdownMenuItem>
        <MenuSeparator as="hr" {...menu} />
        <DropdownMenuItem {...menu} as={AppearanceMenu} />
        <MenuSeparator as="hr" {...menu} />
        <DropdownMenuItem {...menu} onClick={handleLogout}>
          {t("Log out")}
        </DropdownMenuItem>
      </ContextMenu>
    </>
  );
}

const ChangeTheme = styled(Flex)`
  width: 100%;
`;

export default observer(AccountMenu);
