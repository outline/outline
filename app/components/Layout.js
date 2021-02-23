// @flow
import { observer } from "mobx-react";
import { MenuIcon } from "outline-icons";
import * as React from "react";
import { Helmet } from "react-helmet";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";
import { Switch, Route, useHistory } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import ErrorSuspended from "scenes/ErrorSuspended";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import Analytics from "components/Analytics";
import Button from "components/Button";
import DocumentHistory from "components/DocumentHistory";
import Flex from "components/Flex";
import { LoadingIndicatorBar } from "components/LoadingIndicator";
import Modal from "components/Modal";
import Sidebar from "components/Sidebar";
import SettingsSidebar from "components/Sidebar/Settings";
import SkipNavContent from "components/SkipNavContent";
import SkipNavLink from "components/SkipNavLink";
import useStores from "hooks/useStores";
import { meta } from "utils/keyboard";
import {
  homeUrl,
  searchUrl,
  matchDocumentSlug as slug,
} from "utils/routeHelpers";

type Props = {
  children?: ?React.Node,
  actions?: ?React.Node,
  title?: ?React.Node,
  notifications?: React.Node,
};

function Layout({ children, actions, title, notifications }: Props) {
  const history = useHistory();
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = React.useState(
    false
  );
  const { auth, ui } = useStores();
  const { t } = useTranslation();

  useHotkeys(`${meta}+.`, () => {
    ui.toggleCollapsedSidebar();
  });

  useHotkeys("shift+/", () => {
    setKeyboardShortcutsOpen(true);
  });

  const handleCloseKeyboardShortcuts = React.useCallback(() => {
    setKeyboardShortcutsOpen(false);
  }, []);

  useHotkeys("t", "/", `${meta}+k`, (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    ev.stopPropagation();
    history.push(searchUrl());
  });

  useHotkeys("d", () => {
    history.push(homeUrl());
  });

  const { user, team } = auth;
  const showSidebar = auth.authenticated && user && team;
  const sidebarCollapsed = ui.isEditing || ui.sidebarCollapsed;

  if (auth.isSuspended) return <ErrorSuspended />;

  return (
    <Container column auto>
      <Helmet>
        <title>{team && team.name ? team.name : "Outline"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      <SkipNavLink />
      <Analytics />

      {ui.progressBarVisible && <LoadingIndicatorBar />}
      {notifications}

      <MobileMenuButton
        onClick={ui.toggleMobileSidebar}
        icon={<MenuIcon />}
        iconColor="currentColor"
        neutral
      />

      <Container auto>
        {showSidebar && (
          <Switch>
            <Route path="/settings" component={SettingsSidebar} />
            <Route component={Sidebar} />
          </Switch>
        )}

        <SkipNavContent />
        <Content
          auto
          justify="center"
          $isResizing={ui.sidebarIsResizing}
          $sidebarCollapsed={sidebarCollapsed}
          style={
            sidebarCollapsed
              ? undefined
              : { marginLeft: `${ui.sidebarWidth}px` }
          }
        >
          {children}
        </Content>

        <Switch>
          <Route
            path={`/doc/${slug}/history/:revisionId?`}
            component={DocumentHistory}
          />
        </Switch>
      </Container>
      <Modal
        isOpen={keyboardShortcutsOpen}
        onRequestClose={handleCloseKeyboardShortcuts}
        title={t("Keyboard shortcuts")}
      >
        <KeyboardShortcuts />
      </Modal>
    </Container>
  );
}

const Container = styled(Flex)`
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  position: relative;
  width: 100%;
  min-height: 100%;
`;

const MobileMenuButton = styled(Button)`
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: ${(props) => props.theme.depths.sidebar - 1};

  ${breakpoint("tablet")`
    display: none;
  `};

  @media print {
    display: none;
  }
`;

const Content = styled(Flex)`
  margin: 0;
  transition: ${(props) =>
    props.$isResizing ? "none" : `margin-left 100ms ease-out`};

  @media print {
    margin: 0;
  }

  ${breakpoint("mobile", "tablet")`
    margin-left: 0 !important;
  `}

  ${breakpoint("tablet")`
    ${(props) =>
      props.$sidebarCollapsed &&
      `margin-left: ${props.theme.sidebarCollapsedWidth}px;`}
  `};
`;

export default observer(Layout);
