import { compact } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { GroupPermission } from "@shared/types";
import { GroupPermissionHelper } from "@shared/utils/GroupPermissionHelper";
import type Group from "~/models/Group";
import type User from "~/models/User";
import Badge from "~/components/Badge";
import { HEADER_HEIGHT } from "~/components/Header";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import { UserLabel } from "~/components/UserLabel";
import Text from "~/components/Text";
import Time from "~/components/Time";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useGroupUserMenuActions } from "~/hooks/useGroupUserMenuActions";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { GroupMemberMenu } from "~/menus/GroupMemberMenu";
import { FILTER_HEIGHT } from "./StickyFilters";
import GroupMemberSelectionToolbar from "./GroupMemberSelectionToolbar";
import { HStack } from "~/components/primitives/HStack";

const ROW_HEIGHT = 50;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<User>, "columns" | "rowHeight"> & {
  group: Group;
};

const GroupMemberRowContextMenu = observer(function GroupMemberRowContextMenu({
  group,
  user,
  menuLabel,
  children,
}: {
  group: Group;
  user: User;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useGroupUserMenuActions();
  return (
    <ActionContextProvider value={{ activeModels: [group, user] }}>
      <ContextMenu action={action} ariaLabel={menuLabel}>
        {children}
      </ContextMenu>
    </ActionContextProvider>
  );
});

/**
 * Table component for displaying group members with permission management.
 */
export const GroupMembersTable = observer(function GroupMembersTable({
  group,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const { groupUsers } = useStores();
  const can = usePolicy(group);
  const canManage = can.update && !group.isExternallyManaged;

  const isRowSelectable = useCallback(
    (user: User) => !!groupUsers.membership(group.id, user.id),
    [groupUsers, group.id]
  );

  const applyContextMenu = useCallback(
    (user: User, rowElement: React.ReactNode) => (
      <GroupMemberRowContextMenu
        group={group}
        user={user}
        menuLabel={t("Group member options")}
      >
        {rowElement}
      </GroupMemberRowContextMenu>
    ),
    [group, t]
  );

  const columns = useMemo<TableColumn<User>[]>(
    () =>
      compact<TableColumn<User>>([
        {
          type: "data",
          id: "name",
          header: t("Name"),
          accessor: (user) => user.name,
          component: (user) => (
            <UserLabel user={user} primary>
              {user.isAdmin && <Badge primary>{t("Admin")}</Badge>}
            </UserLabel>
          ),
          width: "3fr",
        },
        {
          type: "data",
          id: "lastActiveAt",
          header: t("Last active"),
          accessor: (user) => user.lastActiveAt,
          component: (user) => (
            <HStack spacing={4} wrap>
              {user.lastActiveAt ? (
                <Time dateTime={user.lastActiveAt} addSuffix />
              ) : (
                <Text type="tertiary">{t("Never signed in")}</Text>
              )}
              {user.isInvited && <Badge>{t("Invited")}</Badge>}
            </HStack>
          ),
          width: "1fr",
        },
        {
          type: "data",
          id: "role",
          header: t("Role"),
          sortable: false,
          accessor: (user) =>
            groupUsers.membership(group.id, user.id)?.permission ?? "",
          component: (user) => {
            const permission = groupUsers.membership(
              group.id,
              user.id
            )?.permission;
            return permission ? (
              <HStack>
                <Badge primary={permission === GroupPermission.Admin}>
                  {GroupPermissionHelper.displayName(permission, t)}
                </Badge>
              </HStack>
            ) : null;
          },
          width: "1fr",
        },
        canManage
          ? {
              type: "action",
              id: "action",
              component: (user) => (
                <GroupMemberMenu group={group} user={user} />
              ),
              width: "50px",
            }
          : undefined,
      ]),
    [t, canManage, group, groupUsers]
  );

  return (
    <SortableTable
      id="groupMembers"
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      decorateRow={canManage ? applyContextMenu : undefined}
      isRowSelectable={canManage ? isRowSelectable : undefined}
      selectionToolbar={<GroupMemberSelectionToolbar group={group} />}
      {...rest}
    />
  );
});
