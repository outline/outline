// @flow
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Collection from "models/Collection";
import Button from "components/Button";
import Divider from "components/Divider";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import InputSelectPermission from "components/InputSelectPermission";
import Labeled from "components/Labeled";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import AddGroupsToCollection from "./AddGroupsToCollection";
import AddPeopleToCollection from "./AddPeopleToCollection";
import CollectionGroupMemberListItem from "./components/CollectionGroupMemberListItem";
import MemberListItem from "./components/MemberListItem";
import useBoolean from "hooks/useBoolean";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";

type Props = {|
  collection: Collection,
|};

function CollectionPermissions({ collection }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const {
    ui,
    memberships,
    collectionGroupMemberships,
    users,
    groups,
  } = useStores();
  const [
    addGroupModalOpen,
    handleAddGroupModalOpen,
    handleAddGroupModalClose,
  ] = useBoolean();
  const [
    addMemberModalOpen,
    handleAddMemberModalOpen,
    handleAddMemberModalClose,
  ] = useBoolean();

  const handleRemoveUser = React.useCallback(
    async (user) => {
      try {
        await memberships.delete({
          collectionId: collection.id,
          userId: user.id,
        });
        ui.showToast(
          t(`{{ userName }} was removed from the collection`, {
            userName: user.name,
          }),
          {
            type: "success",
          }
        );
      } catch (err) {
        ui.showToast(t("Could not remove user"), { type: "error" });
      }
    },
    [memberships, ui, collection, t]
  );

  const handleUpdateUser = React.useCallback(
    async (user, permission) => {
      try {
        await memberships.create({
          collectionId: collection.id,
          userId: user.id,
          permission,
        });
        ui.showToast(
          t(`{{ userName }} permissions were updated`, { userName: user.name }),
          {
            type: "success",
          }
        );
      } catch (err) {
        ui.showToast(t("Could not update user"), { type: "error" });
      }
    },
    [memberships, ui, collection, t]
  );

  const handleRemoveGroup = React.useCallback(
    async (group) => {
      try {
        await collectionGroupMemberships.delete({
          collectionId: collection.id,
          groupId: group.id,
        });
        ui.showToast(
          t(`The {{ groupName }} group was removed from the collection`, {
            groupName: group.name,
          }),
          {
            type: "success",
          }
        );
      } catch (err) {
        ui.showToast(t("Could not remove group"), { type: "error" });
      }
    },
    [collectionGroupMemberships, ui, collection, t]
  );

  const handleUpdateGroup = React.useCallback(
    async (group, permission) => {
      try {
        await collectionGroupMemberships.create({
          collectionId: collection.id,
          groupId: group.id,
          permission,
        });
        ui.showToast(
          t(`{{ groupName }} permissions were updated`, {
            groupName: group.name,
          }),
          {
            type: "success",
          }
        );
      } catch (err) {
        ui.showToast(t("Could not update user"), { type: "error" });
      }
    },
    [collectionGroupMemberships, ui, collection, t]
  );

  const handleChangePermission = React.useCallback(
    async (ev) => {
      try {
        await collection.save({ permission: ev.target.value });
        ui.showToast(t("Default access permissions were updated"), {
          type: "success",
        });
      } catch (err) {
        ui.showToast(t("Could not update permissions"), { type: "error" });
      }
    },
    [collection, ui, t]
  );

  const fetchOptions = React.useMemo(() => ({ id: collection.id }), [
    collection.id,
  ]);

  const collectionName = collection.name;
  const collectionGroups = groups.inCollection(collection.id);
  const collectionUsers = users.inCollection(collection.id);
  const isEmpty = !collectionGroups.length && !collectionUsers.length;

  return (
    <Flex column>
      <InputSelectPermission
        onChange={handleChangePermission}
        value={collection.permission || ""}
        short
      />
      <PermissionExplainer>
        {!collection.permission && (
          <Trans
            defaults="The <em>{{ collectionName }}</em> collection is private. Team members have no access to it by default."
            values={{ collectionName }}
            components={{ em: <strong /> }}
          />
        )}
        {collection.permission === "read" && (
          <Trans
            defaults="Team members can view documents in the <em>{{ collectionName }}</em> collection by default."
            values={{ collectionName }}
            components={{ em: <strong /> }}
          />
        )}
        {collection.permission === "read_write" && (
          <Trans
            defaults="Team members can view and edit documents in the <em>{{ collectionName }}</em> collection by
          default."
            values={{ collectionName }}
            components={{ em: <strong /> }}
          />
        )}
      </PermissionExplainer>
      <Labeled label={t("Additional access")}>
        <Actions>
          <Button
            type="button"
            onClick={handleAddGroupModalOpen}
            icon={<PlusIcon />}
            neutral
          >
            {t("Add groups")}
          </Button>{" "}
          <Button
            type="button"
            onClick={handleAddMemberModalOpen}
            icon={<PlusIcon />}
            neutral
          >
            {t("Add people")}
          </Button>
        </Actions>
      </Labeled>
      <Divider />
      {isEmpty && (
        <Empty>
          <Trans>
            Add specific access for individual groups and team members
          </Trans>
        </Empty>
      )}
      <PaginatedList
        items={collectionGroups}
        fetch={collectionGroupMemberships.fetchPage}
        options={fetchOptions}
        renderItem={(group) => (
          <CollectionGroupMemberListItem
            key={group.id}
            group={group}
            collectionGroupMembership={collectionGroupMemberships.get(
              `${group.id}-${collection.id}`
            )}
            onRemove={() => handleRemoveGroup(group)}
            onUpdate={(permission) => handleUpdateGroup(group, permission)}
          />
        )}
      />
      {collectionGroups.length ? <Divider /> : null}
      <PaginatedList
        key={`collection-users-${collection.permission || "none"}`}
        items={collectionUsers}
        fetch={memberships.fetchPage}
        options={fetchOptions}
        renderItem={(item) => (
          <MemberListItem
            key={item.id}
            user={item}
            membership={memberships.get(`${item.id}-${collection.id}`)}
            canEdit={item.id !== user.id}
            onRemove={() => handleRemoveUser(item)}
            onUpdate={(permission) => handleUpdateUser(item, permission)}
          />
        )}
      />
      <Modal
        title={t(`Add groups to {{ collectionName }}`, {
          collectionName: collection.name,
        })}
        onRequestClose={handleAddGroupModalClose}
        isOpen={addGroupModalOpen}
      >
        <AddGroupsToCollection
          collection={collection}
          onSubmit={handleAddGroupModalClose}
        />
      </Modal>
      <Modal
        title={t(`Add people to {{ collectionName }}`, {
          collectionName: collection.name,
        })}
        onRequestClose={handleAddMemberModalClose}
        isOpen={addMemberModalOpen}
      >
        <AddPeopleToCollection
          collection={collection}
          onSubmit={handleAddMemberModalClose}
        />
      </Modal>
    </Flex>
  );
}

const Empty = styled(HelpText)`
  margin-top: 8px;
`;

const PermissionExplainer = styled(HelpText)`
  margin-top: -8px;
  margin-bottom: 24px;
`;

const Actions = styled.div`
  margin-bottom: 12px;
`;

export default observer(CollectionPermissions);
