// @flow
import { observer } from "mobx-react";
import {
  ArchiveIcon,
  HomeIcon,
  EditIcon,
  SearchIcon,
  StarredIcon,
  ShapesIcon,
  TrashIcon,
  PlusIcon,
  SettingsIcon,
} from "outline-icons";
import * as React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import CollectionNew from "scenes/CollectionNew";
import Invite from "scenes/Invite";
import Bubble from "components/Bubble";
import Flex from "components/Flex";
import Modal from "components/Modal";
import Scrollable from "components/Scrollable";
import Sidebar from "./Sidebar";
import Collections from "./components/Collections";
import Section from "./components/Section";
import SidebarLink from "./components/SidebarLink";
import TeamButton from "./components/TeamButton";
import useStores from "hooks/useStores";
import AccountMenu from "menus/AccountMenu";

function MainSidebar() {
  const { t } = useTranslation();
  const { policies, auth, documents } = useStores();
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [
    createCollectionModalOpen,
    setCreateCollectionModalOpen,
  ] = React.useState(false);

  React.useEffect(() => {
    documents.fetchDrafts();
    documents.fetchTemplates();
  }, [documents]);

  const handleCreateCollectionModalOpen = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      setCreateCollectionModalOpen(true);
    },
    []
  );

  const handleCreateCollectionModalClose = React.useCallback(() => {
    setCreateCollectionModalOpen(false);
  }, []);

  const handleInviteModalOpen = React.useCallback((ev: SyntheticEvent<>) => {
    ev.preventDefault();
    setInviteModalOpen(true);
  }, []);

  const handleInviteModalClose = React.useCallback(() => {
    setInviteModalOpen(false);
  }, []);

  const [dndArea, setDndArea] = React.useState();
  const handleSidebarRef = React.useCallback((node) => setDndArea(node), []);
  const html5Options = React.useMemo(() => ({ rootElement: dndArea }), [
    dndArea,
  ]);

  const { user, team } = auth;
  if (!user || !team) return null;

  const can = policies.abilities(team.id);

  return (
    <Sidebar ref={handleSidebarRef}>
      {dndArea && (
        <DndProvider backend={HTML5Backend} options={html5Options}>
          <AccountMenu>
            {(props) => (
              <TeamButton
                {...props}
                subheading={user.name}
                teamName={team.name}
                logoUrl={team.avatarUrl}
                showDisclosure
              />
            )}
          </AccountMenu>
          <Scrollable flex topShadow>
            <Section>
              <SidebarLink
                to="/home"
                icon={<HomeIcon color="currentColor" />}
                exact={false}
                label={t("Home")}
              />
              <SidebarLink
                to={{
                  pathname: "/search",
                  state: { fromMenu: true },
                }}
                icon={<SearchIcon color="currentColor" />}
                label={t("Search")}
                exact={false}
              />
              <SidebarLink
                to="/starred"
                icon={<StarredIcon color="currentColor" />}
                exact={false}
                label={t("Starred")}
              />
              {can.createDocument && (
                <SidebarLink
                  to="/templates"
                  icon={<ShapesIcon color="currentColor" />}
                  exact={false}
                  label={t("Templates")}
                  active={
                    documents.active ? documents.active.template : undefined
                  }
                />
              )}
              {can.createDocument && (
                <SidebarLink
                  to="/drafts"
                  icon={<EditIcon color="currentColor" />}
                  label={
                    <Drafts align="center">
                      {t("Drafts")}
                      <Bubble count={documents.totalDrafts} />
                    </Drafts>
                  }
                  active={
                    documents.active
                      ? !documents.active.publishedAt &&
                        !documents.active.isDeleted &&
                        !documents.active.isTemplate
                      : undefined
                  }
                />
              )}
            </Section>
            <Section auto>
              <Collections
                onCreateCollection={handleCreateCollectionModalOpen}
              />
            </Section>
            <Section>
              <SidebarLink
                to="/archive"
                icon={<ArchiveIcon color="currentColor" />}
                exact={false}
                label={t("Archive")}
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
                label={t("Trash")}
                active={
                  documents.active ? documents.active.isDeleted : undefined
                }
              />
              <SidebarLink
                to="/settings"
                icon={<SettingsIcon color="currentColor" />}
                exact={false}
                label={t("Settings")}
              />
              {can.inviteUser && (
                <SidebarLink
                  to="/settings/people"
                  onClick={handleInviteModalOpen}
                  icon={<PlusIcon color="currentColor" />}
                  label={`${t("Invite people")}…`}
                />
              )}
            </Section>
          </Scrollable>
          {can.inviteUser && (
            <Modal
              title={t("Invite people")}
              onRequestClose={handleInviteModalClose}
              isOpen={inviteModalOpen}
            >
              <Invite onSubmit={handleInviteModalClose} />
            </Modal>
          )}
          <Modal
            title={t("Create a collection")}
            onRequestClose={handleCreateCollectionModalClose}
            isOpen={createCollectionModalOpen}
          >
            <CollectionNew onSubmit={handleCreateCollectionModalClose} />
          </Modal>
        </DndProvider>
      )}
    </Sidebar>
  );
}

const Drafts = styled(Flex)`
  height: 24px;
`;

export default observer(MainSidebar);
