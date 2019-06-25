// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import {
  ArchiveIcon,
  HomeIcon,
  EditIcon,
  SearchIcon,
  StarredIcon,
  PlusIcon,
} from 'outline-icons';

import Flex from 'shared/components/Flex';
import Modal from 'components/Modal';
import Invite from 'scenes/Invite';
import AccountMenu from 'menus/AccountMenu';
import Sidebar from './Sidebar';
import Scrollable from 'components/Scrollable';
import Section from './components/Section';
import Collections from './components/Collections';
import SidebarLink from './components/SidebarLink';
import HeaderBlock from './components/HeaderBlock';
import Bubble from './components/Bubble';

import AuthStore from 'stores/AuthStore';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';
import { observable } from 'mobx';

type Props = {
  auth: AuthStore,
  documents: DocumentsStore,
  ui: UiStore,
};

@observer
class MainSidebar extends React.Component<Props> {
  @observable inviteModalOpen: boolean = false;

  componentDidMount() {
    this.props.documents.fetchDrafts();
  }

  handleCreateCollection = () => {
    this.props.ui.setActiveModal('collection-new');
  };

  handleInviteModalOpen = () => {
    this.inviteModalOpen = true;
  };

  handleInviteModalClose = () => {
    this.inviteModalOpen = false;
  };

  render() {
    const { auth, documents } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    const draftDocumentsCount = documents.drafts.length;

    return (
      <Sidebar>
        <AccountMenu
          label={
            <HeaderBlock
              subheading={user.name}
              teamName={team.name}
              logoUrl={team.avatarUrl}
              showDisclosure
            />
          }
        />
        <Flex auto column>
          <Scrollable shadow>
            <Section>
              <SidebarLink
                to="/dashboard"
                icon={<HomeIcon />}
                exact={false}
                label="Home"
              />
              <SidebarLink
                to={{
                  pathname: '/search',
                  state: { fromMenu: true },
                }}
                icon={<SearchIcon />}
                label="Search"
                exact={false}
              />
              <SidebarLink
                to="/starred"
                icon={<StarredIcon />}
                exact={false}
                label="Starred"
              />
              <SidebarLink
                to="/drafts"
                icon={
                  draftDocumentsCount > 0 && draftDocumentsCount < 10 ? (
                    <Bubble count={draftDocumentsCount} />
                  ) : (
                    <EditIcon />
                  )
                }
                label="Drafts"
                active={
                  documents.active ? !documents.active.publishedAt : undefined
                }
              />
            </Section>
            <Section>
              <Collections onCreateCollection={this.handleCreateCollection} />
            </Section>
            <Section>
              <SidebarLink
                to="/archive"
                icon={<ArchiveIcon />}
                exact={false}
                label="Archive"
                active={
                  documents.active ? documents.active.isArchived : undefined
                }
              />
              {user.isAdmin && (
                <SidebarLink
                  onClick={this.handleInviteModalOpen}
                  icon={<PlusIcon />}
                  label="Invite people…"
                />
              )}
            </Section>
          </Scrollable>
        </Flex>
        <Modal
          title="Invite people"
          onRequestClose={this.handleInviteModalClose}
          isOpen={this.inviteModalOpen}
        >
          <Invite onSubmit={this.handleInviteModalClose} />
        </Modal>
      </Sidebar>
    );
  }
}

export default inject('documents', 'auth', 'ui')(MainSidebar);
