import { observer } from "mobx-react";
import { darken, lighten } from "polished";
import React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import type { Reaction as TReaction } from "@shared/types";
import { getEmojiId } from "@shared/utils/emoji";
import User from "~/models/User";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useCurrentUser from "~/hooks/useCurrentUser";
import { hover } from "~/styles";
import { ReactionData } from "~/types";

const MaxUsernamesInTooltip = 3;

type Props = {
  reaction: TReaction;
  reactedUsers: ReactionData["user"][];
  onAddReaction: (emoji: string) => Promise<void>;
  onRemoveReaction: (emoji: string) => Promise<void>;
};

const useTooltipContent = ({
  reactedUsers,
  currUser,
  emoji,
  active,
}: {
  reactedUsers: Props["reactedUsers"];
  currUser: User;
  emoji: string;
  active: boolean;
}) => {
  const { t } = useTranslation();

  if (!reactedUsers.length) {
    return;
  }

  const usernames: string[] = [];

  if (active) {
    usernames.push(t("You"));
  }

  const otherUsernames = reactedUsers
    .filter((user) => user.id !== currUser.id)
    .map((user) => user.name);

  usernames.push(
    ...otherUsernames.slice(
      0,
      active ? MaxUsernamesInTooltip - 1 : MaxUsernamesInTooltip
    )
  );

  const diff = reactedUsers.length - usernames.length;
  if (diff > 0) {
    usernames.push(`${diff} ` + (diff === 1 ? t("other") : t("others")));
  }

  const joinedUsernames = usernames.reduce((content, name, idx) => {
    if (idx === 0) {
      return name;
    } else if (idx === usernames.length - 1) {
      return `${content} ${t("and")} ${name}`;
    } else {
      return `${content}, ${name}`;
    }
  }, "");

  return `${joinedUsernames} ${t("reacted with")} :${getEmojiId(emoji)}:`;
};

const Reaction: React.FC<Props> = ({
  reaction,
  reactedUsers,
  onAddReaction,
  onRemoveReaction,
}) => {
  const user = useCurrentUser();

  const active = reaction.userIds.includes(user.id);

  const tooltipContent = useTooltipContent({
    reactedUsers,
    currUser: user,
    emoji: reaction.emoji,
    active,
  });

  const handleClick = React.useCallback(
    (event: React.SyntheticEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      active
        ? void onRemoveReaction(reaction.emoji)
        : void onAddReaction(reaction.emoji);
    },
    [reaction, active, onAddReaction, onRemoveReaction]
  );

  const DisplayedEmoji = React.useMemo(
    () => (
      <EmojiButton $active={active} onClick={handleClick}>
        <Flex gap={6} justify="center" align="center">
          <Emoji size={13}>{reaction.emoji}</Emoji>
          <Count weight="bold">{reaction.userIds.length}</Count>
        </Flex>
      </EmojiButton>
    ),
    [reaction.emoji, reaction.userIds, active, handleClick]
  );

  return tooltipContent ? (
    <Tooltip content={tooltipContent} delay={250} placement="bottom">
      {DisplayedEmoji}
    </Tooltip>
  ) : (
    <>{DisplayedEmoji}</>
  );
};

const EmojiButton = styled(NudeButton)<{ $active: boolean }>`
  width: auto;
  height: 28px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: ${s("backgroundTransition")};

  ${({ $active, theme }) =>
    $active
      ? theme.isDark
        ? css`
            background-color: ${darken(0.1, theme.accent)};
            border-color: ${darken(0.08, theme.accent)};

            &: ${hover} {
              background-color: ${darken(0.2, theme.accent)};
            }
          `
        : css`
            background-color: ${lighten(0.38, theme.accent)};
            border-color: ${lighten(0.34, theme.accent)};

            &: ${hover} {
              background-color: ${lighten(0.3, theme.accent)};
            }
          `
      : css`
          background-color: ${s("listItemHoverBackground")};
          border-color: ${s("buttonNeutralBorder")};

          &: ${hover} {
            background-color: ${s("buttonNeutralBackground")};
          }
        `}
`;

const Count = styled(Text)`
  font-size: 11px;
`;

export default observer(Reaction);
