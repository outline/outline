import compact from "lodash/compact";
import { GroupIcon } from "outline-icons";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import { s, hover } from "@shared/styles";
import Group from "~/models/Group";
import Facepile from "~/components/Facepile";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import GroupMenu from "~/menus/GroupMenu";
import { ViewGroupMembersDialog } from "./GroupDialogs";
import { FILTER_HEIGHT } from "./StickyFilters";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<Group>, "columns" | "rowHeight">;

export function GroupsTable(props: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleViewMembers = React.useCallback(
    (group: Group) => {
      dialogs.openModal({
        title: t("Group members"),
        content: <ViewGroupMembersDialog group={group} />,
        fullscreen: true,
      });
    },
    [t, dialogs]
  );

  const columns = React.useMemo<TableColumn<Group>[]>(
    () =>
      compact<TableColumn<Group>>([
        {
          type: "data",
          id: "name",
          header: t("Name"),
          accessor: (group) => group.name,
          component: (group) => (
            <Flex align="center" gap={8}>
              <Image>
                <GroupIcon size={24} />
              </Image>
              <Flex column>
                <Title onClick={() => handleViewMembers(group)}>
                  {group.name}
                </Title>
                <Text type="tertiary" size="small">
                  <Trans
                    defaults="{{ count }} member"
                    values={{ count: group.memberCount }}
                  />
                </Text>
              </Flex>
            </Flex>
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

            return (
              <Flex>
                <Facepile users={users} overflow={overflow} />
              </Flex>
            );
          },
          width: "1fr",
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
      {...props}
    />
  );
}

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
