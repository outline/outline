// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import CollectionGroupMembership from "models/CollectionGroupMembership";
import Group from "models/Group";
import GroupListItem from "components/GroupListItem";
import InputSelect, { type Props as SelectProps } from "components/InputSelect";
import CollectionGroupMemberMenu from "menus/CollectionGroupMemberMenu";

type Props = {|
  group: Group,
  collectionGroupMembership: ?CollectionGroupMembership,
  onUpdate: (permission: string) => any,
  onRemove: () => any,
|};

const CollectionGroupMemberListItem = ({
  group,
  collectionGroupMembership,
  onUpdate,
  onRemove,
}: Props) => {
  const { t } = useTranslation();

  const PERMISSIONS = React.useMemo(
    () => [
      { label: t("View only"), value: "read" },
      { label: t("View and edit"), value: "read_write" },
    ],
    [t]
  );

  return (
    <GroupListItem
      group={group}
      onRemove={onRemove}
      onUpdate={onUpdate}
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
          <Spacer />
          <CollectionGroupMemberMenu
            onMembers={openMembersModal}
            onRemove={onRemove}
          />
        </>
      )}
    />
  );
};

const Spacer = styled.div`
  width: 8px;
`;

const Select = (styled(InputSelect)`
  margin: 0;
  font-size: 14px;
  border-color: transparent;

  select {
    margin: 0;
  }
`: React.ComponentType<SelectProps>);

export default CollectionGroupMemberListItem;
