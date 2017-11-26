// @flow
import React from 'react';
import { Switch, Route, withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import keydown from 'react-keydown';
import Analytics from 'shared/components/Analytics';
import Flex from 'shared/components/Flex';
import { layout } from 'shared/styles/constants';
import { documentEditUrl, homeUrl, searchUrl } from 'utils/routeHelpers';

import { LoadingIndicatorBar } from 'components/LoadingIndicator';
import Sidebar from 'components/Sidebar';
import SettingsSidebar from 'components/Sidebar/Settings';
import Modals from 'components/Modals';
import Toasts from 'components/Toasts';

import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  history: Object,
  location: Location,
  documents: DocumentsStore,
  children?: ?React.Element<any>,
  actions?: ?React.Element<any>,
  title?: ?React.Element<any>,
  auth: AuthStore,
  ui: UiStore,
  notifications?: React.Element<any>,
};

@observer
class Layout extends React.Component {
  props: Props;
  scrollable: ?HTMLDivElement;

  @keydown(['/', 't'])
  goToSearch(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.history.push(searchUrl());
  }

  @keydown('d')
  goToDashboard() {
    this.props.history.push(homeUrl());
  }

  @keydown('e')
  goToEdit(ev) {
    const activeDocument = this.props.documents.active;
    if (!activeDocument) return;

    ev.preventDefault();
    ev.stopPropagation();
    this.props.history.push(documentEditUrl(activeDocument));
  }

  @keydown('shift+/')
  openKeyboardShortcuts() {
    this.props.ui.setActiveModal('keyboard-shortcuts');
  }

  render() {
    const { auth, ui } = this.props;
    const { user, team } = auth;
    const showSidebar = auth.authenticated && user && team;

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
        <Toasts />
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
  margin-left: ${props => (props.editMode ? 0 : layout.sidebarWidth)};
  transition: margin-left 200ms ease-in-out;
`;

export default withRouter(inject('user', 'auth', 'ui', 'documents')(Layout));
