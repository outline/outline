import invariant from "invariant";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { CollectionPermission } from "@shared/types";
import Group from "~/models/Group";
import User from "~/models/User";
import Button from "~/components/Button";
import Divider from "~/components/Divider";
import Flex from "~/components/Flex";
import Labeled from "~/components/Labeled";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import AddGroups from "./AddGroups";
import AddPeople from "./AddPeople";
import CollectionPermissions from "./components/CollectionPermissions";
import GroupMemberListItem from "./components/GroupMemberListItem";
import MemberListItem from "./components/MemberListItem";

type Props = {
  type: "collection" | "document";
  objectId: string;
};

function Permissions({ type, objectId }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const {
    collections,
    documents,
    collectionMemberships,
    documentMemberships,
    collectionGroupMemberships,
    documentGroupMemberships,
    users,
    groups,
  } = useStores();
  const { showToast } = useToasts();

  const collection = type === "collection" ? collections.get(objectId) : null;
  const document = type === "document" ? documents.get(objectId) : null;
  const object = collection ?? document;

  invariant(object, `${type} not found`);

  const name = collection?.name ?? document?.title;

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

  const guardAgainstPermissionChange = (
    oldPermission: CollectionPermission,
    userOrGroup: "user" | "group"
  ) => {
    if (oldPermission === CollectionPermission.PartialRead) {
      return confirm(
        t(
          "Changing collection permission will remove all individual document permissions for this {{ userOrGroup }}. Are you sure you would like to continue?",
          { userOrGroup }
        )
      );
    }
    return true;
  };

  const handleRemoveUser = React.useCallback(
    async (user, membership) => {
      try {
        if (type === "collection") {
          if (!guardAgainstPermissionChange(membership.permission, "user")) {
            return;
          }

          await collectionMemberships.delete({
            collectionId: objectId,
            userId: user.id,
          });
        } else {
          await documentMemberships.delete({
            documentId: objectId,
            userId: user.id,
          });
        }
        showToast(
          t(`{{ userName }} was removed from the ${type}`, {
            userName: user.name,
          }),
          {
            type: "success",
          }
        );
      } catch (err) {
        showToast(t("Could not remove user"), {
          type: "error",
        });
      }
    },
    [collectionMemberships, documentMemberships, showToast, objectId, t, type]
  );

  const handleUpdateUser = React.useCallback(
    async (user, permission, oldPermission) => {
      try {
        if (type === "collection") {
          if (!guardAgainstPermissionChange(oldPermission, "user")) {
            return false;
          }

          await collectionMemberships.create({
            collectionId: objectId,
            userId: user.id,
            permission,
          });
        } else {
          await documentMemberships.create({
            documentId: objectId,
            userId: user.id,
            permission,
          });
        }
        showToast(
          t(`{{ userName }} permissions were updated`, {
            userName: user.name,
          }),
          {
            type: "success",
          }
        );
      } catch (err) {
        showToast(t("Could not update user"), {
          type: "error",
        });
      }
    },
    [collectionMemberships, documentMemberships, showToast, objectId, t, type]
  );

  const handleRemoveGroup = React.useCallback(
    async (group, membership) => {
      try {
        if (type === "collection") {
          if (!guardAgainstPermissionChange(membership.permission, "group")) {
            return;
          }

          await collectionGroupMemberships.delete({
            collectionId: objectId,
            groupId: group.id,
          });
        } else {
          await documentGroupMemberships.delete({
            documentId: objectId,
            groupId: group.id,
          });
        }
        showToast(
          t(`The {{ groupName }} group was removed from the ${type}`, {
            groupName: group.name,
          }),
          {
            type: "success",
          }
        );
      } catch (err) {
        showToast(t("Could not remove group"), {
          type: "error",
        });
      }
    },
    [
      collectionGroupMemberships,
      documentGroupMemberships,
      showToast,
      objectId,
      t,
      type,
    ]
  );

  const handleUpdateGroup = React.useCallback(
    async (group, permission, oldPermission) => {
      try {
        if (type === "collection") {
          if (!guardAgainstPermissionChange(oldPermission, "group")) {
            return false;
          }

          await collectionGroupMemberships.create({
            collectionId: objectId,
            groupId: group.id,
            permission,
          });
        } else {
          await documentGroupMemberships.create({
            documentId: objectId,
            groupId: group.id,
            permission,
          });
        }
        showToast(
          t(`{{ groupName }} permissions were updated`, {
            groupName: group.name,
          }),
          {
            type: "success",
          }
        );
      } catch (err) {
        showToast(t("Could not update user"), {
          type: "error",
        });
      }
    },
    [
      collectionGroupMemberships,
      documentGroupMemberships,
      showToast,
      objectId,
      t,
      type,
    ]
  );

  const fetchOptions = React.useMemo(
    () => ({
      id: objectId,
    }),
    [objectId]
  );

  const addedGroups =
    type === "collection"
      ? groups.inCollection(objectId)
      : groups.inDocument(objectId);
  const addedUsers =
    type === "collection"
      ? users.inCollection(objectId)
      : users.inDocument(objectId);
  const isEmpty = !addedGroups.length && !addedUsers.length;

  const memberships =
    type === "collection" ? collectionMemberships : documentMemberships;
  const groupMemberships =
    type === "collection"
      ? collectionGroupMemberships
      : documentGroupMemberships;

  return (
    <Flex column>
      {collection && <CollectionPermissions collection={collection} />}
      <Labeled label={type === "collection" ? t("Additional access") : ""}>
        <Actions gap={8}>
          <Button
            type="button"
            onClick={handleAddGroupModalOpen}
            icon={<PlusIcon />}
            neutral
          >
            {t("Add groups")}
          </Button>
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
        items={addedGroups}
        fetch={groupMemberships.fetchPage}
        options={fetchOptions}
        renderItem={(group: Group) => (
          <GroupMemberListItem
            key={group.id}
            group={group}
            membership={groupMemberships.get(`${group.id}-${objectId}`)}
            onRemove={handleRemoveGroup.bind(null, group)}
            onUpdate={handleUpdateGroup.bind(null, group)}
          />
        )}
      />
      {addedGroups.length ? <Divider /> : null}
      <PaginatedList
        key={`added-users-${
          collection ? collection.permission || "none" : "document"
        }`}
        items={addedUsers}
        fetch={memberships.fetchPage}
        options={fetchOptions}
        renderItem={(item: User) => (
          <MemberListItem
            key={item.id}
            user={item}
            membership={memberships.get(`${item.id}-${objectId}`)}
            canEdit={item.id !== user.id}
            onRemove={handleRemoveUser.bind(null, item)}
            onUpdate={handleUpdateUser.bind(null, item)}
          />
        )}
      />
      <Modal
        title={t(`Add groups to {{ name }}`, { name })}
        onRequestClose={handleAddGroupModalClose}
        isOpen={addGroupModalOpen}
      >
        <AddGroups object={object} onSubmit={handleAddGroupModalClose} />
      </Modal>
      <Modal
        title={t(`Add people to {{ name }}`, { name })}
        onRequestClose={handleAddMemberModalClose}
        isOpen={addMemberModalOpen}
      >
        <AddPeople object={object} onSubmit={handleAddMemberModalClose} />
      </Modal>
    </Flex>
  );
}

const Empty = styled(Text)`
  margin-top: 8px;
`;

const Actions = styled(Flex)`
  margin-bottom: 12px;
`;

export default observer(Permissions);
