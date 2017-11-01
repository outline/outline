// @flow
import React from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import keydown from 'react-keydown';
import Flex from 'shared/components/Flex';
import { color, layout } from 'shared/styles/constants';
import { documentEditUrl, homeUrl, searchUrl } from 'utils/routeHelpers';

import Avatar from 'components/Avatar';
import { LoadingIndicatorBar } from 'components/LoadingIndicator';
import Scrollable from 'components/Scrollable';
import HomeIcon from 'components/Icon/HomeIcon';
import SearchIcon from 'components/Icon/SearchIcon';
import StarredIcon from 'components/Icon/StarredIcon';
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
  location: Location,
  collections: CollectionsStore,
  documents: DocumentsStore,
  children?: ?React.Element<any>,
  actions?: ?React.Element<any>,
  title?: ?React.Element<any>,
  auth: AuthStore,
  ui: UiStore,
  notifications?: React.Element<any>,
};

@observer class Layout extends React.Component {
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

  handleCreateCollection = () => {
    this.props.ui.setActiveModal('collection-new');
  };

  handleEditCollection = () => {
    this.props.ui.setActiveModal('collection-edit');
  };

  setScrollableRef = ref => {
    this.scrollable = ref;
  };

  scrollToActiveDocument = ref => {
    const scrollable = this.scrollable;
    if (!ref || !scrollable) return;

    const container = scrollable.getBoundingClientRect();
    const bounds = ref.getBoundingClientRect();
    const scrollTop = bounds.top + container.top;
    scrollable.scrollTop = scrollTop;
  };

  render() {
    const { auth, documents, ui } = this.props;
    const { user, team } = auth;

    return (
      <Container column auto>
        <Helmet>
          <title>Atlas</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </Helmet>

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
                <Scrollable innerRef={this.setScrollableRef}>
                  <LinkSection>
                    <SidebarLink to="/dashboard" icon={<HomeIcon />}>
                      Home
                    </SidebarLink>
                    <SidebarLink to="/search" icon={<SearchIcon />}>
                      Search
                    </SidebarLink>
                    <SidebarLink to="/starred" icon={<StarredIcon />}>
                      Starred
                    </SidebarLink>
                  </LinkSection>
                  <LinkSection>
                    <SidebarCollections
                      history={this.props.history}
                      location={this.props.location}
                      activeDocument={documents.active}
                      onCreateCollection={this.handleCreateCollection}
                      activeDocumentRef={this.scrollToActiveDocument}
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
  padding: 0 24px;
  position: relative;
`;

export default withRouter(
  inject('user', 'auth', 'ui', 'documents', 'collections')(Layout)
);
