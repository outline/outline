import { isUUID } from "validator";
import { getEmojiFromName } from "../editor/lib/emoji";
import { CustomEmoji } from "./CustomEmoji";

type Props = {
  /** The text to render, which may contain emoji shortcodes like :smile: or :uuid: */
  children: string;
  /** Size of rendered custom emojis */
  emojiSize?: number | string;
};

// Matches emoji shortcodes like :smile: or :550e8400-e29b-41d4-a716-446655440000:
const emojiShortcodeRegex = /:([a-zA-Z0-9_-]+):/g;

/**
 * Renders text with embedded emoji shortcodes. Standard emoji shortcodes like
 * :smile: are converted to native emoji characters, while UUID shortcodes are
 * rendered as custom emoji images.
 *
 * @param props.children - the text to render, which may contain emoji shortcodes.
 * @param props.emojiSize - size of rendered custom emojis.
 * @returns a React element with text and inline emojis.
 */
export function EmojiText({ children, emojiSize = "1em" }: Props) {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = emojiShortcodeRegex.exec(children)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index));
    }

    const shortcode = match[1];

    if (isUUID(shortcode)) {
      // Custom emoji - render as image
      parts.push(
        <CustomEmoji key={key++} value={shortcode} size={emojiSize} />
      );
    } else {
      // Standard emoji - convert to native character
      const emoji = getEmojiFromName(shortcode);
      if (emoji !== "?") {
        parts.push(emoji);
      } else {
        // Unknown shortcode, keep original text
        parts.push(match[0]);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  // Reset regex state for next call
  emojiShortcodeRegex.lastIndex = 0;

  return <>{parts}</>;
}
