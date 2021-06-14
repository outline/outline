// @flow
import { observer } from "mobx-react";
import { PlusIcon, GroupIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import GroupNew from "scenes/GroupNew";
import Button from "components/Button";
import Empty from "components/Empty";
import GroupListItem from "components/GroupListItem";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import Scene from "components/Scene";
import Subheading from "components/Subheading";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import GroupMenu from "menus/GroupMenu";

function Groups() {
  const { t } = useTranslation();
  const { policies, groups } = useStores();
  const team = useCurrentTeam();
  const can = policies.abilities(team.id);
  const [newGroupModalOpen, setNewGroupModalOpen] = React.useState(false);

  const handleNewGroupModalOpen = React.useCallback(() => {
    setNewGroupModalOpen(true);
  }, []);

  const handleNewGroupModalClose = React.useCallback(() => {
    setNewGroupModalOpen(false);
  }, []);

  return (
    <Scene title={t("Groups")} icon={<GroupIcon color="currentColor" />}>
      <Heading>{t("Groups")}</Heading>
      <HelpText>
        <Trans>
          Groups can be used to organize and manage the people on your team.
        </Trans>
      </HelpText>

      {can.createGroup && (
        <Button
          type="button"
          onClick={handleNewGroupModalOpen}
          icon={<PlusIcon />}
          neutral
        >
          {`${t("New group")}…`}
        </Button>
      )}

      <Subheading>{t("All groups")}</Subheading>
      <PaginatedList
        items={groups.orderedData}
        empty={<Empty>{t("No groups have been created yet")}</Empty>}
        fetch={groups.fetchPage}
        renderItem={(item) => (
          <GroupListItem
            key={item.id}
            group={item}
            renderActions={({ openMembersModal }) => (
              <GroupMenu group={item} onMembers={openMembersModal} />
            )}
            showFacepile
          />
        )}
      />

      <Modal
        title={t("Create a group")}
        onRequestClose={handleNewGroupModalClose}
        isOpen={newGroupModalOpen}
      >
        <GroupNew onSubmit={handleNewGroupModalClose} />
      </Modal>
    </Scene>
  );
}

export default observer(Groups);
