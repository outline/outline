// @flow
import * as React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import styled, { withTheme } from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import keydown from 'react-keydown';
import Analytics from 'components/Analytics';
import Flex from 'shared/components/Flex';
import {
  homeUrl,
  searchUrl,
  matchDocumentSlug as slug,
} from 'utils/routeHelpers';

import { LoadingIndicatorBar } from 'components/LoadingIndicator';
import { GlobalStyles } from 'components/DropToImport';
import Sidebar from 'components/Sidebar';
import SettingsSidebar from 'components/Sidebar/Settings';
import Modals from 'components/Modals';
import DocumentHistory from 'components/DocumentHistory';
import Modal from 'components/Modal';
import KeyboardShortcuts from 'scenes/KeyboardShortcuts';
import ErrorSuspended from 'scenes/ErrorSuspended';
import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';

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

  componentWillMount() {
    this.updateBackground();
  }

  componentDidUpdate() {
    this.updateBackground();

    if (this.redirectTo) {
      this.redirectTo = undefined;
    }
  }

  @keydown('shift+/')
  handleOpenKeyboardShortcuts() {
    if (this.props.ui.editMode) return;
    this.keyboardShortcutsOpen = true;
  }

  handleCloseKeyboardShortcuts = () => {
    this.keyboardShortcutsOpen = false;
  };

  updateBackground() {
    // ensure the wider page color always matches the theme
    window.document.body.style.background = this.props.theme.background;
  }

  @keydown(['t', '/', 'meta+k'])
  goToSearch(ev) {
    if (this.props.ui.editMode) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.redirectTo = searchUrl();
  }

  @keydown('d')
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
          <title>Outline</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </Helmet>
        <Analytics />

        {this.props.ui.progressBarVisible && <LoadingIndicatorBar />}
        {this.props.notifications}

        <Container auto>
          {showSidebar && (
            <Switch>
              <Route path="/settings" component={SettingsSidebar} />
              <Route component={Sidebar} />
            </Switch>
          )}

          <Content auto justify="center" editMode={ui.editMode}>
            {this.props.children}
          </Content>

          <Switch>
            <Route
              path={`/doc/${slug}/history/:revisionId?`}
              component={DocumentHistory}
            />
          </Switch>
        </Container>
        <Modals ui={ui} />
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

const Container = styled(Flex)`
  background: ${props => props.theme.background};
  transition: ${props => props.theme.backgroundTransition};
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

  ${breakpoint('tablet')`
    margin-left: ${props => (props.editMode ? 0 : props.theme.sidebarWidth)};
  `};
`;

export default inject('auth', 'ui', 'documents')(withTheme(Layout));
