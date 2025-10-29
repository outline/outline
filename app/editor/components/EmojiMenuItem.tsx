import styled from "styled-components";
import SuggestionsMenuItem, {
  Props as SuggestionsMenuItemProps,
} from "./SuggestionsMenuItem";
import { isInternalUrl } from "@shared/utils/urls";
import { EmojiImage } from "@shared/components/customEmojis";

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
      icon={
        isInternalUrl(emoji) ? (
          <EmojiImage src={emoji} />
        ) : (
          <Emoji className="emoji">{emoji}</Emoji>
        )
      }
    />
  );
}
