import { observer } from "mobx-react";
import { transparentize } from "polished";
import React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s, hover } from "@shared/styles";
import type { ReactionSummary } from "@shared/types";
import { getEmojiId } from "@shared/utils/emoji";
import User from "~/models/User";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useCurrentUser from "~/hooks/useCurrentUser";

type Props = {
  /** Thin reaction data - contains the emoji & active user ids for this reaction. */
  reaction: ReactionSummary;
  /** Users who reacted using this emoji. */
  reactedUsers: User[];
  /** Whether the emoji button should be disabled (prevents add/remove events). */
  disabled: boolean;
  /** Callback when the user intends to add the reaction. */
  onAddReaction: (emoji: string) => Promise<void>;
  /** Callback when the user intends to remove the reaction. */
  onRemoveReaction: (emoji: string) => Promise<void>;
};

const useTooltipContent = ({
  reactedUsers,
  currUser,
  emoji,
  active,
}: {
  reactedUsers: User[];
  currUser: User;
  emoji: string;
  active: boolean;
}) => {
  const { t } = useTranslation();

  if (!reactedUsers.length) {
    return;
  }

  const transformedEmoji = `:${getEmojiId(emoji)}:`;

  switch (reactedUsers.length) {
    case 1: {
      return t("{{ username }} reacted with {{ emoji }}", {
        username: active ? t("You") : reactedUsers[0].name,
        emoji: transformedEmoji,
      });
    }

    case 2: {
      const firstUsername = active ? t("You") : reactedUsers[0].name;
      const secondUsername = active
        ? reactedUsers.find((user) => user.id !== currUser.id)?.name
        : reactedUsers[1].name;

      return t(
        "{{ firstUsername }} and {{ secondUsername }} reacted with {{ emoji }}",
        {
          firstUsername,
          secondUsername,
          emoji: transformedEmoji,
        }
      );
    }

    default: {
      const firstUsername = active ? t("You") : reactedUsers[0].name;
      const count = reactedUsers.length - 1;

      return t(
        "{{ firstUsername }} and {{ count }} others reacted with {{ emoji }}",
        {
          firstUsername,
          count,
          emoji: transformedEmoji,
        }
      );
    }
  }
};

const Reaction: React.FC<Props> = ({
  reaction,
  reactedUsers,
  disabled,
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
      <EmojiButton disabled={disabled} $active={active} onClick={handleClick}>
        <Flex gap={6} justify="center" align="center">
          <Emoji size={15}>{reaction.emoji}</Emoji>
          <Count weight="xbold">{reaction.userIds.length}</Count>
        </Flex>
      </EmojiButton>
    ),
    [reaction.emoji, reaction.userIds, disabled, active, handleClick]
  );

  return tooltipContent ? (
    <Tooltip content={tooltipContent} placement="bottom">
      {DisplayedEmoji}
    </Tooltip>
  ) : (
    <>{DisplayedEmoji}</>
  );
};

const EmojiButton = styled(NudeButton)<{
  $active: boolean;
  disabled: boolean;
}>`
  width: auto;
  height: 28px;
  padding: 6px;
  border-radius: 12px;
  background: ${s("backgroundTertiary")};
  pointer-events: ${({ disabled }) => disabled && "none"};

  &: ${hover} {
    background: ${s("backgroundQuaternary")};
  }

  ${(props) =>
    props.$active &&
    css`
      background: ${transparentize(0.7, props.theme.accent)};

      &: ${hover} {
        background: ${transparentize(0.5, props.theme.accent)};
      }
    `}
`;

const Count = styled(Text)`
  font-size: 11px;
  color: ${s("buttonNeutralText")};
  padding-right: 1px;
  font-variant-numeric: tabular-nums;
`;

export default observer(Reaction);
