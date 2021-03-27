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
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";

type Props = {|
  collection: Collection,
  onEdit: () => void,
|};

function CollectionPermissions({ collection, onEdit }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const {
    ui,
    memberships,
    collectionGroupMemberships,
    users,
    groups,
  } = useStores();
  const [addGroupModalOpen, setAddGroupModalOpen] = React.useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = React.useState(false);

  const handleRemoveUser = React.useCallback(
    (user) => {
      try {
        memberships.delete({
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
    (user, permission) => {
      try {
        memberships.create({
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
    (group) => {
      try {
        collectionGroupMemberships.delete({
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
    (group, permission) => {
      try {
        collectionGroupMemberships.create({
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

  const fetchOptions = React.useMemo(() => ({ id: collection.id }), [
    collection.id,
  ]);

  const collectionName = collection.name;
  const collectionGroups = groups.inCollection(collection.id);

  return (
    <Flex column>
      <InputSelectPermission
        onChange={(ev) => collection.save({ permission: ev.target.value })}
        value={collection.permission || ""}
        short
      />
      <PermissionExplainer>
        {!collection.permission && (
          <Trans
            defaults="Team members do not have access to the <em>{{ collectionName }}</em> collection by default."
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
            onClick={() => setAddGroupModalOpen(true)}
            icon={<PlusIcon />}
            neutral
          >
            {t("Add groups")}
          </Button>{" "}
          <Button
            type="button"
            onClick={() => setAddMemberModalOpen(true)}
            icon={<PlusIcon />}
            neutral
          >
            {t("Add individual members")}
          </Button>
        </Actions>
      </Labeled>
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
        items={users.inCollection(collection.id)}
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
        onRequestClose={() => setAddGroupModalOpen(false)}
        isOpen={addGroupModalOpen}
      >
        <AddGroupsToCollection
          collection={collection}
          onSubmit={() => setAddGroupModalOpen(false)}
        />
      </Modal>
      <Modal
        title={t(`Add people to {{ collectionName }}`, {
          collectionName: collection.name,
        })}
        onRequestClose={() => setAddMemberModalOpen(false)}
        isOpen={addMemberModalOpen}
      >
        <AddPeopleToCollection
          collection={collection}
          onSubmit={() => setAddMemberModalOpen(false)}
        />
      </Modal>
    </Flex>
  );
}

const PermissionExplainer = styled(HelpText)`
  margin-top: -8px;
  margin-bottom: 24px;
`;

const Actions = styled.div`
  margin-bottom: 12px;
`;

export default observer(CollectionPermissions);
