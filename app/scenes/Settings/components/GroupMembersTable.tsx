import compact from "lodash/compact";
import { observer } from "mobx-react";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { GroupPermission } from "@shared/types";
import type Group from "~/models/Group";
import type User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Badge from "~/components/Badge";
import { HEADER_HEIGHT } from "~/components/Header";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Text from "~/components/Text";
import Time from "~/components/Time";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { Permission } from "~/types";
import { EmptySelectValue } from "~/types";
import { FILTER_HEIGHT } from "./StickyFilters";
import { HStack } from "~/components/primitives/HStack";

const ROW_HEIGHT = 50;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<User>, "columns" | "rowHeight"> & {
  group: Group;
};

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

  const permissions = useMemo(
    () =>
      [
        {
          label: t("Group admin"),
          value: GroupPermission.Admin,
        },
        {
          label: t("Member"),
          value: GroupPermission.Member,
        },
        {
          divider: true,
          label: t("Remove"),
          value: EmptySelectValue,
        },
      ] as Permission[],
    [t]
  );

  const handlePermissionChange = useCallback(
    async (
      user: User,
      permission: GroupPermission | typeof EmptySelectValue
    ) => {
      try {
        if (permission === EmptySelectValue) {
          await groupUsers.delete({
            userId: user.id,
            groupId: group.id,
          });
          toast.success(
            t(`{{userName}} was removed from the group`, {
              userName: user.name,
            }),
            {
              icon: <Avatar model={user} size={AvatarSize.Toast} />,
            }
          );
        } else {
          await groupUsers.update({
            userId: user.id,
            groupId: group.id,
            permission,
          });
        }
      } catch (err) {
        toast.error((err as Error).message);
        return false;
      }
      return true;
    },
    [t, groupUsers, group.id]
  );

  const columns = useMemo<TableColumn<User>[]>(
    () =>
      compact<TableColumn<User>>([
        {
          type: "data",
          id: "name",
          header: t("Name"),
          accessor: (user) => user.name,
          component: (user) => {
            const gu = groupUsers.orderedData.find(
              (m) => m.userId === user.id && m.groupId === group.id
            );
            return (
              <HStack>
                <Avatar model={user} size={AvatarSize.Large} />
                <Text selectable>{user.name}</Text>
                {user.isAdmin ? (
                  <Badge primary>{t("Admin")}</Badge>
                ) : gu?.permission === GroupPermission.Admin ? (
                  <Badge>{t("Group admin")}</Badge>
                ) : null}
              </HStack>
            );
          },
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
        can.update
          ? {
              type: "data",
              id: "permission",
              header: t("Permission"),
              sortable: false,
              accessor: (user) => {
                const gu = groupUsers.orderedData.find(
                  (m) => m.userId === user.id && m.groupId === group.id
                );
                return gu?.permission ?? "";
              },
              component: (user: User) => (
                <InputMemberPermissionSelect
                  permissions={permissions}
                  disabled={group.isExternallyManaged}
                  onChange={(permission) =>
                    handlePermissionChange(
                      user,
                      permission as GroupPermission | typeof EmptySelectValue
                    )
                  }
                  value={
                    groupUsers.orderedData.find(
                      (m) => m.userId === user.id && m.groupId === group.id
                    )?.permission
                  }
                />
              ),
              width: "130px",
            }
          : undefined,
      ]),
    [
      t,
      can.update,
      group.id,
      groupUsers.orderedData,
      permissions,
      handlePermissionChange,
    ]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      {...rest}
    />
  );
});
