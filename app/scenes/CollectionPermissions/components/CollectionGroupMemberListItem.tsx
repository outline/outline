import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import Group from "~/models/Group";
import GroupListItem from "~/components/GroupListItem";
import InputSelect, { Props as SelectProps } from "~/components/InputSelect";
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
          <Select
            label={t("Permissions")}
            options={[
              {
                label: t("View only"),
                value: CollectionPermission.Read,
              },
              {
                label: t("View and edit"),
                value: CollectionPermission.ReadWrite,
              },
            ]}
            value={
              collectionGroupMembership
                ? collectionGroupMembership.permission
                : undefined
            }
            onChange={onUpdate}
            ariaLabel={t("Permissions")}
            labelHidden
            nude
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

const Select = styled(InputSelect)`
  margin: 0;
  font-size: 14px;
  border-color: transparent;
  box-shadow: none;
  color: ${s("textSecondary")};

  select {
    margin: 0;
  }
` as React.ComponentType<SelectProps>;

export default CollectionGroupMemberListItem;
