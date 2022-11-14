import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import ListItem from "~/components/List/Item";
import Time from "~/components/Time";
import UserMenu from "~/menus/UserMenu";

type Props = {
  user: User;
  showMenu: boolean;
};

const UserListItem = ({ user, showMenu }: Props) => {
  const { t } = useTranslation();

  return (
    <ListItem
      title={<Title>{user.name}</Title>}
      image={<Avatar model={user} size={32} />}
      subtitle={
        <>
          {user.email ? `${user.email} · ` : undefined}
          {user.lastActiveAt ? (
            <Trans>
              Active <Time dateTime={user.lastActiveAt} /> ago
            </Trans>
          ) : (
            t("Invited")
          )}
          {user.isAdmin && <Badge primary={user.isAdmin}>{t("Admin")}</Badge>}
          {user.isSuspended && <Badge>{t("Suspended")}</Badge>}
        </>
      }
      actions={showMenu ? <UserMenu user={user} /> : undefined}
    />
  );
};

const Title = styled.span`
  &:hover {
    text-decoration: underline;
    cursor: var(--pointer);
  }
`;

export default observer(UserListItem);
