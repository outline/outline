import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { CollectionPermission } from "@shared/types";
import CollectionMembership from "~/models/CollectionMembership";
import DocumentMembership from "~/models/DocumentMembership";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import InputSelect, { Props as SelectProps } from "~/components/InputSelect";
import ListItem from "~/components/List/Item";
import Time from "~/components/Time";
import MemberMenu from "~/menus/MemberMenu";

interface Props {
  user: User;
  membership?: CollectionMembership | DocumentMembership | undefined;
  canEdit: boolean;
  onAdd?: () => void;
  onRemove?: (membership: this["membership"]) => void;
  onUpdate?: (permission: CollectionPermission) => void | false;
}

const MemberListItem = ({
  user,
  membership,
  onRemove,
  onUpdate,
  onAdd,
  canEdit,
}: Props) => {
  const { t } = useTranslation();

  const handleRemove = onRemove && (() => onRemove(membership));

  return (
    <ListItem
      title={user.name}
      subtitle={
        <>
          {user.lastActiveAt ? (
            <Trans>
              Active <Time dateTime={user.lastActiveAt} /> ago
            </Trans>
          ) : (
            t("Never signed in")
          )}
          {user.isInvited && <Badge>{t("Invited")}</Badge>}
          {user.isAdmin && <Badge primary={user.isAdmin}>{t("Admin")}</Badge>}
        </>
      }
      image={<Avatar src={user.avatarUrl} size={32} />}
      actions={
        <Flex align="center" gap={8}>
          {onUpdate && (
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
                {
                  label: t("Partial access (document-level permissions)"),
                  value: CollectionPermission.PartialRead,
                  selectable: false,
                },
              ]}
              value={membership ? membership.permission : undefined}
              onChange={onUpdate}
              disabled={!canEdit}
              ariaLabel={t("Permissions")}
              labelHidden
              nude
            />
          )}
          {canEdit && (
            <>
              {handleRemove && <MemberMenu onRemove={handleRemove} />}
              {onAdd && (
                <Button onClick={onAdd} neutral>
                  {t("Add")}
                </Button>
              )}
            </>
          )}
        </Flex>
      }
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

export default observer(MemberListItem);
