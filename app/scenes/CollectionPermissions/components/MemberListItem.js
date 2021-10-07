// @flow
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Membership from "models/Membership";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import Flex from "components/Flex";
import InputSelect, { type Props as SelectProps } from "components/InputSelect";
import ListItem from "components/List/Item";
import Time from "components/Time";
import MemberMenu from "menus/MemberMenu";

type Props = {
  user: User,
  membership?: ?Membership,
  canEdit: boolean,
  onAdd?: () => any,
  onRemove?: () => any,
  onUpdate?: (permission: string) => any,
};

const MemberListItem = ({
  user,
  membership,
  onRemove,
  onUpdate,
  onAdd,
  canEdit,
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
        <Flex align="center">
          {onUpdate && (
            <Select
              label={t("Permissions")}
              options={PERMISSIONS}
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
              <Spacer />
              {onRemove && <MemberMenu onRemove={onRemove} />}
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

export default MemberListItem;
