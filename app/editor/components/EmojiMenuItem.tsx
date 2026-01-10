import type { Props as SuggestionsMenuItemProps } from "./SuggestionsMenuItem";
import SuggestionsMenuItem from "./SuggestionsMenuItem";
import { Emoji } from "~/components/Emoji";
import { CustomEmoji } from "@shared/components/CustomEmoji";
import { isUUID } from "validator";

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
        isUUID(emoji) ? <CustomEmoji value={emoji} /> : <Emoji>{emoji}</Emoji>
      }
    />
  );
}
