// @flow
import * as React from "react";
import { observer, inject } from "mobx-react";
import styled from "styled-components";
import {
  ArchiveIcon,
  HomeIcon,
  EditIcon,
  SearchIcon,
  StarredIcon,
  TrashIcon,
  PlusIcon,
} from "outline-icons";

import Flex from "shared/components/Flex";
import Modal from "components/Modal";
import Invite from "scenes/Invite";
import AccountMenu from "menus/AccountMenu";
import Sidebar from "./Sidebar";
import Scrollable from "components/Scrollable";
import Section from "./components/Section";
import Collections from "./components/Collections";
import SidebarLink from "./components/SidebarLink";
import HeaderBlock from "./components/HeaderBlock";
import Bubble from "./components/Bubble";

import AuthStore from "stores/AuthStore";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import { observable } from "mobx";

type Props = {
  auth: AuthStore,
  documents: DocumentsStore,
  policies: PoliciesStore,
  ui: UiStore,
};

@observer
class MainSidebar extends React.Component<Props> {
  @observable inviteModalOpen: boolean = false;

  componentDidMount() {
    this.props.documents.fetchDrafts();
  }

  handleCreateCollection = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.props.ui.setActiveModal("collection-new");
  };

  handleInviteModalOpen = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.inviteModalOpen = true;
  };

  handleInviteModalClose = () => {
    this.inviteModalOpen = false;
  };

  render() {
    const { auth, documents, policies } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    const draftDocumentsCount = documents.drafts.length;
    const can = policies.abilities(team.id);

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
                to="/home"
                icon={<HomeIcon color="currentColor" />}
                exact={false}
                label="Home"
              />
              <SidebarLink
                to={{
                  pathname: "/search",
                  state: { fromMenu: true },
                }}
                icon={<SearchIcon color="currentColor" />}
                label="Search"
                exact={false}
              />
              <SidebarLink
                to="/starred"
                icon={<StarredIcon color="currentColor" />}
                exact={false}
                label="Starred"
              />
              <SidebarLink
                to="/drafts"
                icon={<EditIcon color="currentColor" />}
                label={
                  <Drafts align="center">
                    Drafts{draftDocumentsCount > 0 && (
                      <Bubble count={draftDocumentsCount} />
                    )}
                  </Drafts>
                }
                active={
                  documents.active
                    ? !documents.active.publishedAt &&
                      !documents.active.isDeleted
                    : undefined
                }
              />
            </Section>
            <Section>
              <Collections onCreateCollection={this.handleCreateCollection} />
            </Section>
            <Section>
              <SidebarLink
                to="/archive"
                icon={<ArchiveIcon color="currentColor" />}
                exact={false}
                label="Archive"
                active={
                  documents.active
                    ? documents.active.isArchived && !documents.active.isDeleted
                    : undefined
                }
              />
              <SidebarLink
                to="/trash"
                icon={<TrashIcon color="currentColor" />}
                exact={false}
                label="Trash"
                active={
                  documents.active ? documents.active.isDeleted : undefined
                }
              />
              {can.invite && (
                <SidebarLink
                  to="/settings/people"
                  onClick={this.handleInviteModalOpen}
                  icon={<PlusIcon color="currentColor" />}
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

const Drafts = styled(Flex)`
  height: 24px;
`;

export default inject("documents", "policies", "auth", "ui")(MainSidebar);
