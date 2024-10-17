import { observer } from "mobx-react";
import React from "react";
import type { Reaction as TReaction } from "@shared/types";
import useHover from "~/hooks/useHover";
import { EmojiReactedUsers, ReactionData } from "~/types";
import Logger from "~/utils/Logger";
import Flex from "../Flex";
import Reaction from "./Reaction";

type Props = {
  reactions: TReaction[];
  onAddReaction: (emoji: string) => Promise<void>;
  onRemoveReaction: (emoji: string) => Promise<void>;
  fetchReactionData: () => Promise<ReactionData[]>;
  className?: string;
};

const ReactionList: React.FC<Props> = ({
  reactions,
  onAddReaction,
  onRemoveReaction,
  fetchReactionData,
  className,
}) => {
  const [emojiReactedUsers, setEmojiReactedUsers] =
    React.useState<EmojiReactedUsers>({});
  const { hovered, onMouseEnter, onMouseLeave } = useHover({
    duration: 250,
  });

  React.useEffect(() => {
    const loadReactionData = async () => {
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
        Logger.warn("Could not prefetch reaction data");
      }
    };

    if (hovered) {
      void loadReactionData();
    }
  }, [hovered, setEmojiReactedUsers, fetchReactionData]);

  return (
    <Flex
      className={className}
      align="center"
      gap={6}
      wrap
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {reactions.map((reaction) => (
        <Reaction
          key={reaction.emoji}
          reaction={reaction}
          reactedUsers={emojiReactedUsers[reaction.emoji] ?? []}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      ))}
    </Flex>
  );
};

export default observer(ReactionList);
