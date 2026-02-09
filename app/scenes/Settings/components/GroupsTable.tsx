import compact from "lodash/compact";
import { GroupIcon } from "outline-icons";
import * as React from "react";
import { useCallback, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import { s, hover } from "@shared/styles";
import type Group from "~/models/Group";
import Facepile from "~/components/Facepile";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { useGroupMenuActions } from "~/hooks/useGroupMenuActions";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import GroupMenu from "~/menus/GroupMenu";
import { ViewGroupMembersDialog } from "./GroupDialogs";
import { FILTER_HEIGHT } from "./StickyFilters";
import NudeButton from "~/components/NudeButton";
import { AvatarSize } from "~/components/Avatar";
import { HStack } from "~/components/primitives/HStack";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<Group>, "columns" | "rowHeight">;

function GroupRowContextMenu({
  group,
  menuLabel,
  children,
}: {
  group: Group;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useGroupMenuActions(group);
  return (
    <ContextMenu action={action} ariaLabel={menuLabel}>
      {children}
    </ContextMenu>
  );
}

export function GroupsTable(props: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleViewMembers = useCallback(
    (group: Group) => {
      dialogs.openModal({
        title: t("Group members"),
        content: <ViewGroupMembersDialog group={group} />,
      });
    },
    [t, dialogs]
  );

  const applyContextMenu = useCallback(
    (group: Group, rowElement: React.ReactNode) => (
      <GroupRowContextMenu group={group} menuLabel={t("Group options")}>
        {rowElement}
      </GroupRowContextMenu>
    ),
    [t]
  );

  const columns = useMemo<TableColumn<Group>[]>(
    () =>
      compact<TableColumn<Group>>([
        {
          type: "data",
          id: "name",
          header: t("Name"),
          accessor: (group) => group.name,
          component: (group) => (
            <HStack>
              <Image>
                <GroupIcon size={24} />
              </Image>
              <Flex column>
                <Title onClick={() => handleViewMembers(group)}>
                  {group.name}
                </Title>
                <Text type="tertiary" size="small" weight="normal">
                  <Trans
                    defaults="{{ count }} member"
                    values={{ count: group.memberCount }}
                  />
                </Text>
              </Flex>
            </HStack>
          ),
          width: "2fr",
        },
        {
          type: "data",
          id: "description",
          header: t("Description"),
          accessor: (group) => group.description || "",
          component: (group) => (
            <Text type="secondary" size="small" weight="normal">
              {group.description}
            </Text>
          ),
          width: "2fr",
        },
        {
          type: "data",
          id: "members",
          header: t("Members"),
          accessor: (group) => `${group.memberCount} members`,
          component: (group) => {
            const users = group.users.slice(0, MAX_AVATAR_DISPLAY);
            const overflow = group.memberCount - users.length;

            if (users.length === 0) {
              return null;
            }

            return (
              <GroupMembers
                onClick={() => handleViewMembers(group)}
                width={
                  (users.length + (overflow > 0 ? 1 : 0)) * AvatarSize.Large
                }
              >
                <Facepile users={users} overflow={overflow} />
              </GroupMembers>
            );
          },
          width: "1.5fr",
          sortable: false,
        },
        {
          type: "data",
          id: "createdAt",
          header: t("Date created"),
          accessor: (group) => group.createdAt,
          component: (group) =>
            group.createdAt ? (
              <Time dateTime={group.createdAt} addSuffix />
            ) : null,
          width: "1fr",
        },
        {
          type: "action",
          id: "action",
          component: (group) => <GroupMenu group={group} />,
          width: "50px",
        },
      ]),
    [t, handleViewMembers]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      decorateRow={applyContextMenu}
      {...props}
    />
  );
}

const GroupMembers = styled(NudeButton)`
  justify-content: flex-start;
  display: flex;
`;

const Image = styled(Flex)`
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${s("backgroundSecondary")};
  border-radius: 32px;
`;

const Title = styled.span`
  &: ${hover} {
    text-decoration: underline;
    cursor: var(--pointer);
  }
`;
