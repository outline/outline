// @flow
import React from 'react';
import { withRouter } from 'react-router-dom';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import keydown from 'react-keydown';
import Flex from 'components/Flex';
import { color, layout } from 'styles/constants';
import { documentEditUrl, homeUrl, searchUrl } from 'utils/routeHelpers';

import Avatar from 'components/Avatar';
import { LoadingIndicatorBar } from 'components/LoadingIndicator';
import Scrollable from 'components/Scrollable';
import Icon from 'components/Icon';
import Toasts from 'components/Toasts';
import AccountMenu from 'menus/AccountMenu';

import SidebarCollections from './components/SidebarCollections';
import SidebarLink from './components/SidebarLink';
import HeaderBlock from './components/HeaderBlock';
import Modals from './components/Modals';

import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';
import CollectionsStore from 'stores/CollectionsStore';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
  documents: DocumentsStore,
  children?: ?React.Element<any>,
  actions?: ?React.Element<any>,
  title?: ?React.Element<any>,
  auth: AuthStore,
  ui: UiStore,
  search: ?boolean,
  notifications?: React.Element<any>,
};

@observer class Layout extends React.Component {
  props: Props;

  static defaultProps = {
    search: true,
  };

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
  goToOpenKeyboardShortcuts() {
    this.props.ui.setActiveModal('keyboard-shortcuts');
  }

  handleCreateCollection = () => {
    this.props.ui.setActiveModal('collection-new');
  };

  handleEditCollection = () => {
    this.props.ui.setActiveModal('collection-edit');
  };

  render() {
    const { auth, documents, ui } = this.props;
    const { user, team } = auth;

    return (
      <Container column auto>
        <Helmet
          title="Atlas"
          meta={[
            {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1.0',
            },
          ]}
        />

        {this.props.ui.progressBarVisible && <LoadingIndicatorBar />}

        {this.props.notifications}

        <Flex auto>
          {auth.authenticated &&
            user &&
            team &&
            <Sidebar column editMode={ui.editMode}>
              <AccountMenu
                label={
                  <HeaderBlock user={user} team={team}>
                    <Avatar src={user.avatarUrl} />
                  </HeaderBlock>
                }
              />

              <Flex auto column>
                <Scrollable>
                  <LinkSection>
                    <SidebarLink to="/dashboard">
                      <Icon type="Home" /> Home
                    </SidebarLink>
                    <SidebarLink to="/search">
                      <Icon type="Search" /> Search
                    </SidebarLink>
                    <SidebarLink to="/starred">
                      <Icon type="Star" /> Starred
                    </SidebarLink>
                  </LinkSection>
                  <LinkSection>
                    <SidebarCollections
                      history={this.props.history}
                      activeDocument={documents.active}
                      onCreateCollection={this.handleCreateCollection}
                    />
                  </LinkSection>
                </Scrollable>
              </Flex>
            </Sidebar>}

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

const Sidebar = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  left: ${props => (props.editMode ? `-${layout.sidebarWidth}` : 0)};
  width: ${layout.sidebarWidth};
  background: ${color.smoke};
  transition: left 200ms ease-in-out;
`;

const LinkSection = styled(Flex)`
  flex-direction: column;
  margin: 24px 0;
  position: relative;
`;

export default withRouter(
  inject('user', 'auth', 'ui', 'documents', 'collections')(Layout)
);
