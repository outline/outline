import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import type Group from "~/models/Group";
import type GroupUser from "~/models/GroupUser";
import { Avatar, AvatarSize } from "~/components/Avatar";
import PaginatedList from "~/components/PaginatedList";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/primitives/Popover";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { ListItem } from "./ListItem";
import Flex from "@shared/components/Flex";
import { useTranslation } from "react-i18next";

type Props = {
  /** The group to display members for */
  group: Group;
  /** The trigger element that opens the popover */
  children: React.ReactElement;
};

export const GroupMembersPopover = observer(({ group, children }: Props) => {
  const { t } = useTranslation();
  const { groupUsers } = useStores();
  const [open, setOpen] = React.useState(false);

  const members = React.useMemo(
    () => groupUsers.inGroup(group.id),
    [groupUsers.orderedData, group.id]
  );

  const fetchOptions = React.useMemo(
    () => ({
      id: group.id,
    }),
    [group.id]
  );

  const renderItem = React.useCallback(
    (groupUser: GroupUser) => (
      <ListItem
        key={groupUser.id}
        image={<Avatar model={groupUser.user} size={AvatarSize.Medium} />}
        title={groupUser.user.name}
        subtitle={groupUser.user.email}
      />
    ),
    []
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        width={320}
        scrollable
        shrink
      >
        <Container>
          <Flex style={{ marginBottom: 8 }} column>
            <Text size="medium" weight="bold">
              {group.name}
            </Text>
            <Text size="small" type="tertiary">
              {t(`{{ count }} members`, { count: group.memberCount })}
            </Text>
          </Flex>
          {open && (
            <PaginatedList<GroupUser>
              items={members}
              fetch={groupUsers.fetchPage}
              options={fetchOptions}
              renderItem={renderItem}
            />
          )}
        </Container>
      </PopoverContent>
    </Popover>
  );
});

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin: 12px 24px;
`;
