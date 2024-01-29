import * as React from "react";
import styled from "styled-components";
import SuggestionsMenuItem, {
  Props as SuggestionsMenuItemProps,
} from "./SuggestionsMenuItem";

const Emoji = styled.span`
  font-size: 16px;
  line-height: 1.6em;
`;

type EmojiMenuItemProps = Omit<
  SuggestionsMenuItemProps,
  "shortcut" | "theme"
> & {
  emoji: string;
};

export default function EmojiMenuItem({ emoji, ...rest }: EmojiMenuItemProps) {
  return (
    <SuggestionsMenuItem
      {...rest}
      icon={<Emoji className="emoji">{emoji}</Emoji>}
    />
  );
}
