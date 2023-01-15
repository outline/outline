import * as React from "react";
import styled from "styled-components";
import CommandMenuItem, {
  Props as CommandMenuItemProps,
} from "./CommandMenuItem";

const Emoji = styled.span`
  font-size: 16px;
  line-height: 1.6em;
`;

type EmojiMenuItemProps = Omit<CommandMenuItemProps, "shortcut" | "theme"> & {
  emoji: string;
};

export default function EmojiMenuItem({ emoji, ...rest }: EmojiMenuItemProps) {
  return (
    <CommandMenuItem
      {...rest}
      icon={<Emoji className="emoji">{emoji}</Emoji>}
    />
  );
}
