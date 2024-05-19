import * as React from "react";
import { useTranslation } from "react-i18next";
import { CollectionPermission } from "@shared/types";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import Group from "~/models/Group";
import GroupListItem from "~/components/GroupListItem";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import CollectionGroupMemberMenu from "~/menus/CollectionGroupMemberMenu";

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
}: Props) => {
  const { t } = useTranslation();

  return (
    <GroupListItem
      group={group}
      showAvatar
      renderActions={({ openMembersModal }) => (
        <>
          <InputMemberPermissionSelect
            value={collectionGroupMembership?.permission}
            onChange={onUpdate}
            permissions={[
              {
                label: t("View only"),
                value: CollectionPermission.Read,
              },
              {
                label: t("Can edit"),
                value: CollectionPermission.ReadWrite,
              },
              {
                label: t("Admin"),
                value: CollectionPermission.Admin,
              },
            ]}
          />
          <CollectionGroupMemberMenu
            onMembers={openMembersModal}
            onRemove={onRemove}
          />
        </>
      )}
    />
  );
};

export default CollectionGroupMemberListItem;
