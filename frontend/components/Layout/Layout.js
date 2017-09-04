// @flow
import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { observable } from 'mobx';
import _ from 'lodash';
import keydown from 'react-keydown';
import Flex from 'components/Flex';
import { color, layout } from 'styles/constants';
import { documentEditUrl, homeUrl, searchUrl } from 'utils/routeHelpers';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

import Avatar from 'components/Avatar';
import { LoadingIndicatorBar } from 'components/LoadingIndicator';
import Scrollable from 'components/Scrollable';
import Modal from 'components/Modal';
import AddIcon from 'components/Icon/AddIcon';
import MoreIcon from 'components/Icon/MoreIcon';
import CollectionNew from 'scenes/CollectionNew';
import CollectionEdit from 'scenes/CollectionEdit';
import KeyboardShortcuts from 'scenes/KeyboardShortcuts';
import Settings from 'scenes/Settings';

import SidebarCollection from './components/SidebarCollection';
import SidebarCollectionList from './components/SidebarCollectionList';
import SidebarLink from './components/SidebarLink';
import HeaderBlock from './components/HeaderBlock';

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

  @observable modal = null;

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

  handleLogout = () => {
    this.props.auth.logout(() => this.props.history.push('/'));
  };

  @keydown('shift+/')
  goToOpenKeyboardShortcuts() {
    this.modal = 'keyboard-shortcuts';
  }

  handleOpenKeyboardShortcuts = () => {
    this.goToOpenKeyboardShortcuts();
  };

  handleOpenSettings = () => {
    this.modal = 'settings';
  };

  handleCreateCollection = () => {
    this.modal = 'create-collection';
  };

  handleEditCollection = () => {
    this.modal = 'edit-collection';
  };

  handleCloseModal = () => {
    this.modal = null;
  };

  render() {
    const { auth, documents, collections, history, ui } = this.props;
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
              <HeaderBlock user={user} team={team}>
                <DropdownMenu label={<Avatar src={user.avatarUrl} />}>
                  <DropdownMenuItem onClick={this.handleOpenSettings}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={this.handleOpenKeyboardShortcuts}>
                    Keyboard shortcuts
                  </DropdownMenuItem>
                  <MenuLink to="/developers">
                    <DropdownMenuItem>API</DropdownMenuItem>
                  </MenuLink>
                  <DropdownMenuItem onClick={this.handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenu>
              </HeaderBlock>
              <Flex column>
                <Scrollable>
                  <LinkSection>
                    <SidebarLink to="/search">Search</SidebarLink>
                  </LinkSection>
                  <LinkSection>
                    <SidebarLink to="/dashboard">Home</SidebarLink>
                    <SidebarLink to="/starred">Starred</SidebarLink>
                  </LinkSection>
                  <LinkSection>
                    {collections.active
                      ? <CollectionAction onClick={this.handleEditCollection}>
                          <MoreIcon />
                        </CollectionAction>
                      : <CollectionAction onClick={this.handleCreateCollection}>
                          <AddIcon />
                        </CollectionAction>}
                    {collections.active
                      ? <SidebarCollection
                          document={documents.active}
                          collection={collections.active}
                          history={this.props.history}
                        />
                      : <SidebarCollectionList history={this.props.history} />}
                  </LinkSection>
                </Scrollable>
              </Flex>
            </Sidebar>}

          <Content auto justify="center" editMode={ui.editMode}>
            {this.props.children}
          </Content>
        </Flex>
        <Modal
          isOpen={this.modal === 'create-collection'}
          onRequestClose={this.handleCloseModal}
          title="Create a collection"
        >
          <CollectionNew
            collections={collections}
            history={history}
            onSubmit={this.handleCloseModal}
          />
        </Modal>
        <Modal
          isOpen={this.modal === 'edit-collection'}
          onRequestClose={this.handleCloseModal}
          title="Edit collection"
        >
          {collections.active &&
            <CollectionEdit
              collection={collections.active}
              collections={collections}
              history={history}
              onSubmit={this.handleCloseModal}
            />}
        </Modal>
        <Modal
          isOpen={this.modal === 'keyboard-shortcuts'}
          onRequestClose={this.handleCloseModal}
          title="Keyboard shortcuts"
        >
          <KeyboardShortcuts />
        </Modal>
        <Modal
          isOpen={this.modal === 'settings'}
          onRequestClose={this.handleCloseModal}
          title="Settings"
        >
          <Settings />
        </Modal>
      </Container>
    );
  }
}

const CollectionAction = styled.a`
  position: absolute;
  top: 8px;
  right: ${layout.hpadding};

  svg {
    opacity: .35;
    width: 16px;
    height: 16px;
  }

  &:hover {
    svg {
      opacity: 1;
    }
  }
`;

const Container = styled(Flex)`
  position: relative;
  width: 100%;
  height: 100%;
`;

const Content = styled(Flex)`
  overflow: scroll;
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: ${props => (props.editMode ? 0 : layout.sidebarWidth)};
  transition: left 200ms ease-in-out;
`;

const MenuLink = styled(Link)`
  color: ${color.text};
`;

const Sidebar = styled(Flex)`
  width: ${layout.sidebarWidth};
  margin-left: ${props => (props.editMode ? `-${layout.sidebarWidth}` : 0)};
  background: rgba(250, 251, 252, 0.71);
  border-right: 1px solid #eceff3;
  transition: margin-left 200ms ease-in-out;
`;

const LinkSection = styled(Flex)`
  flex-direction: column;
  padding: 10px 0;
  position: relative;
`;

export default withRouter(
  inject('user', 'auth', 'ui', 'documents', 'collections')(Layout)
);
