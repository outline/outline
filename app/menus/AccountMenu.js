// @flow
import { observer } from "mobx-react";
import { SunIcon, MoonIcon } from "outline-icons";
import { rgba } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  useMenuState,
  Menu,
  MenuButton,
  MenuItemRadio,
  MenuSeparator,
} from "reakit/Menu";
import styled from "styled-components";
import { fadeAndScaleIn } from "shared/styles/animations";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
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
      <Menu {...menu} aria-label={t("Appearance")}>
        <TempWrapper>
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
        </TempWrapper>
      </Menu>
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
      <Menu {...menu} aria-label={t("Account")}>
        <TempWrapper>
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
        </TempWrapper>
      </Menu>
    </>
  );
}

const ChangeTheme = styled(Flex)`
  width: 100%;
`;

const TempWrapper = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: ${(props) => (props.left !== undefined ? "25%" : "75%")} 0;
  backdrop-filter: blur(10px);
  background: ${(props) => rgba(props.theme.menuBackground, 0.8)};
  border: ${(props) =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  border-radius: 2px;
  padding: 0.5em 0;
  min-width: 180px;
  box-shadow: ${(props) => props.theme.menuShadow};
  pointer-events: all;
  position: absolute;
  z-index: ${(props) => props.theme.depths.menu};

  hr {
    margin: 0.5em 12px;
  }

  @media print {
    display: none;
  }
`;

export default observer(AccountMenu);
