import compact from "lodash/compact";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Text from "@shared/components/Text";
import type User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Badge from "~/components/Badge";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { useUserMenuActions } from "~/hooks/useUserMenuActions";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMobile from "~/hooks/useMobile";
import UserMenu from "~/menus/UserMenu";
import { FILTER_HEIGHT } from "./StickyFilters";
import { HStack } from "~/components/primitives/HStack";
import { VStack } from "~/components/primitives/VStack";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<User>, "columns" | "rowHeight"> & {
  canManage: boolean;
};

function UserRowContextMenu({
  user,
  menuLabel,
  children,
}: {
  user: User;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useUserMenuActions(user);
  return (
    <ContextMenu action={action} ariaLabel={menuLabel}>
      {children}
    </ContextMenu>
  );
}

export function MembersTable({ canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const isMobile = useMobile();

  const applyContextMenu = useCallback(
    (user: User, rowElement: React.ReactNode) => {
      if (currentUser.id === user.id) {
        return rowElement;
      }

      return (
        <UserRowContextMenu user={user} menuLabel={t("User options")}>
          {rowElement}
        </UserRowContextMenu>
      );
    },
    [currentUser.id, t]
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
            <HStack>
              <Avatar model={user} size={AvatarSize.Large} />
              <VStack align="flex-start" spacing={0}>
                <Text selectable>
                  {user.name} {currentUser.id === user.id && `(${t("You")})`}
                </Text>
                {isMobile && canManage && (
                  <Text type="tertiary" selectable>
                    {user.email}
                  </Text>
                )}
              </VStack>
            </HStack>
          ),
          width: "4fr",
        },
        canManage && !isMobile
          ? {
              type: "data",
              id: "email",
              header: t("Email"),
              accessor: (user) => user.email,
              component: (user) => <>{user.email}</>,
              width: "4fr",
            }
          : undefined,
        isMobile
          ? undefined
          : {
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
            <HStack spacing={4} wrap>
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
            </HStack>
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
    [t, currentUser, canManage, isMobile]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      decorateRow={canManage ? applyContextMenu : undefined}
      {...rest}
    />
  );
}
