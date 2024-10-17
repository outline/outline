import React from "react";
import { useTranslation } from "react-i18next";
import { Tab, TabPanel, useTabState } from "reakit";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import PlaceholderText from "~/components/PlaceholderText";
import Text from "~/components/Text";
import { hover } from "~/styles";
import { EmojiReactedUsers, ReactionData } from "~/types";

type Props = {
  fetchReactionData: () => Promise<ReactionData[]>;
};

const ViewReactionsDialog: React.FC<Props> = ({ fetchReactionData }) => {
  const { t } = useTranslation();
  const tab = useTabState();

  const [emojiReactedUsers, setEmojiReactedUsers] =
    React.useState<EmojiReactedUsers>({});

  React.useEffect(() => {
    const fetchReactions = async () => {
      try {
        const reactionData = await fetchReactionData();

        const transformedData = reactionData.reduce((acc, data) => {
          const emoji = data.emoji;
          const users = (acc[emoji] ?? []) as EmojiReactedUsers[number];
          users.push(data.user);
          acc[emoji] = users;
          return acc;
        }, {} as EmojiReactedUsers);

        setEmojiReactedUsers(transformedData);
      } catch (err) {
        toast.error(t("Could not load reactions"));
      }
    };

    void fetchReactions();
  }, [t, setEmojiReactedUsers, fetchReactionData]);

  if (!emojiReactedUsers) {
    return <PlaceHolder />;
  }

  return (
    <>
      <TabActionsWrapper>
        {Object.keys(emojiReactedUsers).map((emoji) => (
          <StyledTab
            {...tab}
            key={emoji}
            id={emoji}
            aria-label={t("Reaction")}
            $active={tab.selectedId === emoji}
          >
            <Emoji size={16}>{emoji}</Emoji>
          </StyledTab>
        ))}
      </TabActionsWrapper>
      {Object.entries(emojiReactedUsers).map(([emoji, users]) => (
        <StyledTabPanel {...tab} key={emoji}>
          {users.map((user) => (
            <UserInfo key={user.name} align="center" gap={8}>
              <Avatar model={user} size={AvatarSize.Medium} />
              <Text size="medium">{user.name}</Text>
            </UserInfo>
          ))}
        </StyledTabPanel>
      ))}
    </>
  );
};

const PlaceHolder = React.memo(
  () => (
    <>
      <TabActionsWrapper gap={8} style={{ paddingBottom: "10px" }}>
        <PlaceholderText width={40} height={32} />
        <PlaceholderText width={40} height={32} />
      </TabActionsWrapper>
      <UserInfo align="center" gap={12}>
        <PlaceholderText width={AvatarSize.Medium} height={AvatarSize.Medium} />
        <PlaceholderText height={34} />
      </UserInfo>
      <UserInfo align="center" gap={12}>
        <PlaceholderText width={AvatarSize.Medium} height={AvatarSize.Medium} />
        <PlaceholderText height={34} />
      </UserInfo>
    </>
  ),
  () => true
);
PlaceHolder.displayName = "ViewReactionsPlaceholder";

const TabActionsWrapper = styled(Flex)`
  border-bottom: 1px solid ${s("inputBorder")};
`;

const StyledTab = styled(Tab)<{ $active: boolean }>`
  position: relative;
  font-weight: 500;
  font-size: 14px;
  cursor: var(--pointer);
  background: none;
  border: 0;
  border-radius: 4px 4px 0 0;
  padding: 8px 12px 10px;
  user-select: none;
  transition: background-color 100ms ease;

  &: ${hover} {
    background-color: ${s("listItemHoverBackground")};
  }

  ${({ $active }) =>
    $active &&
    css`
      &:after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: ${s("textSecondary")};
      }
    `}
`;

const StyledTabPanel = styled(TabPanel)`
  height: 300px;
  padding: 5px 0;
  overflow-y: auto;
`;

const UserInfo = styled(Flex)`
  padding: 10px 8px;
`;

export default ViewReactionsDialog;
