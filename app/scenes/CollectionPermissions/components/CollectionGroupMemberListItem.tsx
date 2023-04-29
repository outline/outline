import * as React from "react";
import { CollectionPermission } from "@shared/types";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import Group from "~/models/Group";
import GroupListItem from "~/components/GroupListItem";
import CollectionGroupMemberMenu from "~/menus/CollectionGroupMemberMenu";
import InputMemberPermissionSelect from "./InputMemberPermissionSelect";

type Props = {
  group: Group;
  collectionGroupMembership: CollectionGroupMembership | null | undefined;
  onUpdate: (permission: CollectionPermission) => void;
  onRemove: () => void;
};

const CollectionGroupMemberListItem = ({
  group,
  collectionGroupMembership,
  onUpdate,
  onRemove,
}: Props) => (
  <GroupListItem
    group={group}
    showAvatar
    renderActions={({ openMembersModal }) => (
      <>
        <InputMemberPermissionSelect
          value={
            collectionGroupMembership
              ? collectionGroupMembership.permission
              : undefined
          }
          onChange={onUpdate}
        />
        <CollectionGroupMemberMenu
          onMembers={openMembersModal}
          onRemove={onRemove}
        />
      </>
    )}
  />
);

export default CollectionGroupMemberListItem;
