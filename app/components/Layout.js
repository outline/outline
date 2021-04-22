// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { MenuIcon } from "outline-icons";
import * as React from "react";
import { Helmet } from "react-helmet";
import { withTranslation, type TFunction } from "react-i18next";
import keydown from "react-keydown";
import {
  Switch,
  Route,
  Redirect,
  withRouter,
  type RouterHistory,
} from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import AuthStore from "stores/AuthStore";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import ErrorSuspended from "scenes/ErrorSuspended";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import Button from "components/Button";
import DocumentHistory from "components/DocumentHistory";
import Flex from "components/Flex";
import Guide from "components/Guide";
import { LoadingIndicatorBar } from "components/LoadingIndicator";
import Sidebar from "components/Sidebar";
import SettingsSidebar from "components/Sidebar/Settings";
import SkipNavContent from "components/SkipNavContent";
import SkipNavLink from "components/SkipNavLink";
import { meta } from "utils/keyboard";
import {
  homeUrl,
  searchUrl,
  matchDocumentSlug as slug,
  newDocumentUrl,
} from "utils/routeHelpers";

type Props = {
  documents: DocumentsStore,
  children?: ?React.Node,
  actions?: ?React.Node,
  title?: ?React.Node,
  auth: AuthStore,
  ui: UiStore,
  history: RouterHistory,
  policies: PoliciesStore,
  notifications?: React.Node,
  i18n: Object,
  t: TFunction,
};

@observer
class Layout extends React.Component<Props> {
  scrollable: ?HTMLDivElement;
  @observable redirectTo: ?string;
  @observable keyboardShortcutsOpen: boolean = false;

  componentDidUpdate() {
    if (this.redirectTo) {
      this.redirectTo = undefined;
    }
  }

  @keydown(`${meta}+.`)
  handleToggleSidebar() {
    this.props.ui.toggleCollapsedSidebar();
  }

  @keydown("shift+/")
  handleOpenKeyboardShortcuts() {
    this.keyboardShortcutsOpen = true;
  }

  handleCloseKeyboardShortcuts = () => {
    this.keyboardShortcutsOpen = false;
  };

  @keydown(["t", "/", `${meta}+k`])
  goToSearch(ev: SyntheticEvent<>) {
    ev.preventDefault();
    ev.stopPropagation();
    this.redirectTo = searchUrl();
  }

  @keydown("d")
  goToDashboard() {
    this.redirectTo = homeUrl();
  }

  @keydown("n")
  goToNewDocument() {
    const { activeCollectionId } = this.props.ui;
    if (!activeCollectionId) return;

    const can = this.props.policies.abilities(activeCollectionId);
    if (!can.update) return;

    this.props.history.push(newDocumentUrl(activeCollectionId));
  }

  render() {
    const { auth, t, ui } = this.props;
    const { user, team } = auth;
    const showSidebar = auth.authenticated && user && team;
    const sidebarCollapsed = ui.isEditing || ui.sidebarCollapsed;

    if (auth.isSuspended) return <ErrorSuspended />;
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    return (
      <Container column auto>
        <Helmet>
          <title>{team && team.name ? team.name : "Outline"}</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </Helmet>
        <SkipNavLink />

        {this.props.ui.progressBarVisible && <LoadingIndicatorBar />}
        {this.props.notifications}

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
            {this.props.children}
          </Content>

          <Switch>
            <Route
              path={`/doc/${slug}/history/:revisionId?`}
              component={DocumentHistory}
            />
          </Switch>
        </Container>
        <Guide
          isOpen={this.keyboardShortcutsOpen}
          onRequestClose={this.handleCloseKeyboardShortcuts}
          title={t("Keyboard shortcuts")}
        >
          <KeyboardShortcuts />
        </Guide>
      </Container>
    );
  }
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

export default withTranslation()<Layout>(
  inject("auth", "ui", "documents", "policies")(withRouter(Layout))
);
