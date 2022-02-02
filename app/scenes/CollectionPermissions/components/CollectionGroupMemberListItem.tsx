import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import Group from "~/models/Group";
import GroupListItem from "~/components/GroupListItem";
import InputSelect, { Props as SelectProps } from "~/components/InputSelect";
import CollectionGroupMemberMenu from "~/menus/CollectionGroupMemberMenu";

type Props = {
  group: Group;
  collectionGroupMembership: CollectionGroupMembership | null | undefined;
  onUpdate: (permission: string) => void;
  onRemove: () => void;
};

const CollectionGroupMemberListItem = ({
  group,
  collectionGroupMembership,
  onUpdate,
  onRemove,
}: Props) => {
  const { t } = useTranslation();
  const PERMISSIONS = React.useMemo(
    () => [
      {
        label: t("View only"),
        value: "read",
      },
      {
        label: t("View and edit"),
        value: "read_write",
      },
    ],
    [t]
  );

  return (
    <GroupListItem
      group={group}
      showAvatar
      renderActions={({ openMembersModal }) => (
        <>
          <Select
            label={t("Permissions")}
            options={PERMISSIONS}
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
  color: ${(props) => props.theme.textSecondary};

  select {
    margin: 0;
  }
` as React.ComponentType<SelectProps>;

export default CollectionGroupMemberListItem;
