import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import DocumentGroupMembership from "~/models/DocumentGroupMembership";
import Group from "~/models/Group";
import GroupListItem from "~/components/GroupListItem";
import InputSelect, { Props as SelectProps } from "~/components/InputSelect";
import CollectionGroupMemberMenu from "~/menus/CollectionGroupMemberMenu";

interface Props {
  group: Group;
  membership:
    | CollectionGroupMembership
    | DocumentGroupMembership
    | null
    | undefined;
  onUpdate: (
    permission: CollectionPermission | DocumentPermission
  ) => void | false;
  onRemove: (membership: this["membership"]) => void;
}

const GroupMemberListItem = ({
  group,
  membership,
  onUpdate,
  onRemove,
}: Props) => {
  const { t } = useTranslation();

  const handleRemove = onRemove && (() => onRemove(membership));

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
                value: "read",
              },
              {
                label: t("View and edit"),
                value: "read_write",
              },
              {
                label: t("Partial access (document-level permissions)"),
                value: "partial_read",
                selectable: false,
              },
            ]}
            value={membership ? membership.permission : undefined}
            onChange={onUpdate}
            ariaLabel={t("Permissions")}
            labelHidden
            nude
          />
          <CollectionGroupMemberMenu
            onMembers={openMembersModal}
            onRemove={handleRemove}
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
  color: ${(props) => props.theme.textSecondary};

  select {
    margin: 0;
  }
` as React.ComponentType<SelectProps>;

export default GroupMemberListItem;
