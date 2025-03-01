import compact from "lodash/compact";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Badge from "~/components/Badge";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import UserMenu from "~/menus/UserMenu";
import { FILTER_HEIGHT } from "./StickyFilters";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<User>, "columns" | "rowHeight"> & {
  canManage: boolean;
};

export function MembersTable({ canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();

  const columns = React.useMemo<TableColumn<User>[]>(
    () =>
      compact<TableColumn<User>>([
        {
          type: "data",
          id: "name",
          header: t("Name"),
          accessor: (user) => user.name,
          component: (user) => (
            <Flex align="center" gap={8}>
              <Avatar model={user} size={AvatarSize.Large} /> {user.name}{" "}
              {currentUser.id === user.id && `(${t("You")})`}
            </Flex>
          ),
          width: "4fr",
        },
        canManage
          ? {
              type: "data",
              id: "email",
              header: t("Email"),
              accessor: (user) => user.email,
              component: (user) => <>{user.email}</>,
              width: "4fr",
            }
          : undefined,
        {
          type: "data",
          id: "lastActiveAt",
          header: t("Last active"),
          accessor: (user) => user.lastActiveAt,
          component: (user) =>
            user.lastActiveAt ? (
              <Time dateTime={user.lastActiveAt} addSuffix />
            ) : null,
          width: "2fr",
        },
        {
          type: "data",
          id: "role",
          header: t("Role"),
          accessor: (user) => user.role,
          component: (user) => (
            <Badges wrap>
              {!user.lastActiveAt && <Badge>{t("Invited")}</Badge>}
              {user.isAdmin ? (
                <Badge primary>{t("Admin")}</Badge>
              ) : user.isViewer ? (
                <Badge>{t("Viewer")}</Badge>
              ) : user.isGuest ? (
                <Badge>{t("Guest")}</Badge>
              ) : (
                <Badge>{t("Editor")}</Badge>
              )}
              {user.isSuspended && <Badge>{t("Suspended")}</Badge>}
            </Badges>
          ),
          width: "2fr",
        },
        canManage
          ? {
              type: "action",
              id: "action",
              component: (user) =>
                currentUser.id !== user.id ? <UserMenu user={user} /> : null,
              width: "50px",
            }
          : undefined,
      ]),
    [t, currentUser, canManage]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      {...rest}
    />
  );
}

const Badges = styled(Flex)`
  margin-left: -10px;
  row-gap: 4px;
`;
