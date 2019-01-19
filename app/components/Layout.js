// @flow
import * as React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import keydown from 'react-keydown';
import Analytics from 'components/Analytics';
import Flex from 'shared/components/Flex';
import { documentEditUrl, homeUrl, searchUrl } from 'utils/routeHelpers';

import { LoadingIndicatorBar } from 'components/LoadingIndicator';
import { GlobalStyles } from 'components/DropToImport';
import Sidebar from 'components/Sidebar';
import SettingsSidebar from 'components/Sidebar/Settings';
import Modals from 'components/Modals';
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
};

@observer
class Layout extends React.Component<Props> {
  scrollable: ?HTMLDivElement;
  @observable redirectTo: ?string;

  componentDidUpdate() {
    if (this.redirectTo) {
      this.redirectTo = undefined;
    }
  }

  @keydown(['/', 't', 'meta+k'])
  goToSearch(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    this.redirectTo = searchUrl();
  }

  @keydown('d')
  goToDashboard() {
    this.redirectTo = homeUrl();
  }

  @keydown('e')
  goToEdit(ev) {
    const activeDocument = this.props.documents.active;
    if (!activeDocument) return;

    ev.preventDefault();
    ev.stopPropagation();
    this.redirectTo = documentEditUrl(activeDocument);
  }

  @keydown('shift+/')
  openKeyboardShortcuts() {
    this.props.ui.setActiveModal('keyboard-shortcuts');
  }

  render() {
    const { auth, ui } = this.props;
    const { user, team } = auth;
    const showSidebar = auth.authenticated && user && team;

    if (auth.isSuspended) return <ErrorSuspended />;
    if (this.redirectTo) return <Redirect to={this.redirectTo} />;

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

        <Flex auto>
          {showSidebar && (
            <Switch>
              <Route path="/settings" component={SettingsSidebar} />
              <Route component={Sidebar} />
            </Switch>
          )}

          <Content auto justify="center" editMode={ui.editMode}>
            {this.props.children}
          </Content>
        </Flex>
        <Modals ui={ui} />
        <GlobalStyles />
      </Container>
    );
  }
}

const Container = styled(Flex)`
  position: relative;
  width: 100%;
  height: 100%;
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

export default inject('auth', 'ui', 'documents')(Layout);
