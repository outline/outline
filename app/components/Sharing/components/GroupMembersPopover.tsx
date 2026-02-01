import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Pagination } from "@shared/constants";
import type Group from "~/models/Group";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/primitives/Popover";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import { ListItem } from "./ListItem";
import { Placeholder } from "./Placeholder";

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
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const scrollableRef = React.useRef<HTMLDivElement>(null);

  const members = React.useMemo(
    () => groupUsers.inGroup(group.id),
    [groupUsers, group.id]
  );

  const loadMembers = React.useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const result = await groupUsers.fetchPage({
          id: group.id,
          limit: Pagination.defaultLimit,
          offset,
        } as any);
        
        const pagination = result[PAGINATION_SYMBOL];
        setHasMore(!!pagination?.nextPath);
      } finally {
        setLoading(false);
      }
    },
    [groupUsers, group.id]
  );

  React.useEffect(() => {
    if (open && members.length === 0) {
      void loadMembers();
    }
  }, [open, loadMembers, members.length]);

  const handleLoadMore = React.useCallback(() => {
    if (!loading && hasMore) {
      void loadMembers(members.length);
    }
  }, [loading, hasMore, members.length, loadMembers]);

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const scrolledToBottom =
        element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

      if (scrolledToBottom && hasMore && !loading) {
        handleLoadMore();
      }
    },
    [hasMore, loading, handleLoadMore]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        width={320}
        shrink
      >
        <Container>
          <Header>
            <Text type="secondary" size="small" weight="bold">
              {t("{{ groupName }} members", { groupName: group.name })}
            </Text>
            <Text type="tertiary" size="xsmall">
              {t("{{ count }} member", { count: group.memberCount })}
            </Text>
          </Header>
          <ScrollableContainer
            ref={scrollableRef}
            onScroll={handleScroll}
            style={{ maxHeight: 400 }}
          >
            {loading && members.length === 0 ? (
              <Placeholder />
            ) : (
              <>
                {members.map((groupUser) => (
                  <ListItem
                    key={groupUser.id}
                    image={
                      <Avatar model={groupUser.user} size={AvatarSize.Medium} />
                    }
                    title={groupUser.user.name}
                    subtitle={groupUser.user.email}
                  />
                ))}
                {loading && members.length > 0 && <Placeholder />}
              </>
            )}
          </ScrollableContainer>
        </Container>
      </PopoverContent>
    </Popover>
  );
});

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ScrollableContainer = styled(Scrollable)`
  padding: 0 8px 8px 8px;
`;
