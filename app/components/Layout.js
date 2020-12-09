// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet";
import keydown from "react-keydown";
import { Switch, Route, Redirect } from "react-router-dom";

import Split from "react-split";
import styled, { withTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import AuthStore from "stores/AuthStore";
import DocumentsStore from "stores/DocumentsStore";
import UiStore from "stores/UiStore";
import ErrorSuspended from "scenes/ErrorSuspended";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import Analytics from "components/Analytics";
import DocumentHistory from "components/DocumentHistory";
import { GlobalStyles } from "components/DropToImport";
import Flex from "components/Flex";
import { LoadingIndicatorBar } from "components/LoadingIndicator";
import MenuDrawer from "components/MenuDrawer";
import Modal from "components/Modal";
import Sidebar from "components/Sidebar";
import SettingsSidebar from "components/Sidebar/Settings";
import {
  homeUrl,
  searchUrl,
  matchDocumentSlug as slug,
} from "utils/routeHelpers";

type Props = {
  documents: DocumentsStore,
  children?: ?React.Node,
  actions?: ?React.Node,
  title?: ?React.Node,
  auth: AuthStore,
  ui: UiStore,
  notifications?: React.Node,
  theme: Object,
};

@observer
class Layout extends React.Component<Props> {
  scrollable: ?HTMLDivElement;
  @observable redirectTo: ?string;
  @observable keyboardShortcutsOpen: boolean = false;

  constructor(props) {
    super();
    this.updateBackground(props);
  }

  componentDidUpdate() {
    this.updateBackground(this.props);

    if (this.redirectTo) {
      this.redirectTo = undefined;
    }
  }

  updateBackground(props) {
    // ensure the wider page color always matches the theme
    window.document.body.style.background = props.theme.background;
  }

  @keydown("shift+/")
  handleOpenKeyboardShortcuts() {
    if (this.props.ui.editMode) return;
    this.keyboardShortcutsOpen = true;
  }

  handleCloseKeyboardShortcuts = () => {
    this.keyboardShortcutsOpen = false;
  };

  @keydown(["t", "/", "meta+k"])
  goToSearch(ev) {
    if (this.props.ui.editMode) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.redirectTo = searchUrl();
  }

  @keydown("d")
  goToDashboard() {
    if (this.props.ui.editMode) return;
    this.redirectTo = homeUrl();
  }

  render() {
    const { auth, ui } = this.props;
    const { user, team } = auth;
    const showSidebar = auth.authenticated && user && team;

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
        <Analytics />

        {this.props.ui.progressBarVisible && <LoadingIndicatorBar />}
        {this.props.notifications}

        <Container auto>
          <div>
            <MenuDrawer />
          </div>

          {this.props.children}

          <Switch>
            <Route
              path={`/doc/${slug}/history/:revisionId?`}
              component={DocumentHistory}
            />
          </Switch>
        </Container>
        <Modal
          isOpen={this.keyboardShortcutsOpen}
          onRequestClose={this.handleCloseKeyboardShortcuts}
          title="Keyboard shortcuts"
        >
          <KeyboardShortcuts />
        </Modal>
        <GlobalStyles />
      </Container>
    );
  }
}

const MenuLateral = {
  maxWidth: "300px",
  height: "100%",
  backgroundColor: "red",
  zIndex: "9999",
};

const PaneContent = {
  width: "100%",
};

const resizerStyle = {
  background: "#000",
  cursor: "col-resize",
  margin: "0 5px",
  height: "100%",
  border: "1px solid #DAE1E9",
};

const pane2Style = {
  backgroundColor: "red",
};

const Container = styled(Flex)`
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  position: relative;
  width: 100%;
  min-height: 100%;
`;

const Content = styled(Flex)`
  margin: 0;
  transition: margin-left 100ms ease-out;

  @media print {
    margin: 0;
  }

  ${breakpoint("tablet")`
    margin-left: ${(props) => (props.editMode ? 0 : props.theme.sidebarWidth)};
  `};
`;

export default inject("auth", "ui", "documents")(withTheme(Layout));
