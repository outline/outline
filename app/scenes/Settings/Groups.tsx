import { observer } from "mobx-react";
import { PlusIcon, GroupIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Group from "~/models/Group";
import GroupNew from "~/scenes/GroupNew";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import GroupListItem from "~/components/GroupListItem";
import Heading from "~/components/Heading";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import GroupMenu from "~/menus/GroupMenu";

function Groups() {
  const { t } = useTranslation();
  const { groups } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const [newGroupModalOpen, handleNewGroupModalOpen, handleNewGroupModalClose] =
    useBoolean();

  return (
    <Scene
      title={t("Groups")}
      icon={<GroupIcon />}
      actions={
        <>
          {can.createGroup && (
            <Action>
              <Button
                type="button"
                onClick={handleNewGroupModalOpen}
                icon={<PlusIcon />}
              >
                {`${t("New group")}…`}
              </Button>
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Groups")}</Heading>
      <Text type="secondary">
        <Trans>
          Groups can be used to organize and manage the people on your team.
        </Trans>
      </Text>
      <PaginatedList
        items={groups.orderedData}
        empty={<Empty>{t("No groups have been created yet")}</Empty>}
        fetch={groups.fetchPage}
        heading={
          <h2>
            <Trans>All</Trans>
          </h2>
        }
        renderItem={(item: Group) => (
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
