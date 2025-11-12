import MarkdownIt, { StateCore } from "markdown-it";
import { full as emojiPlugin } from "markdown-it-emoji";
import { nameToEmoji } from "../lib/emoji";

type Options = MarkdownIt.Options & {
  emoji: boolean;
};

function customEmojiRule(state: StateCore) {
  const tokens = state.tokens;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "inline" && token.children) {
      for (let j = 0; j < token.children.length; j++) {
        const childToken = token.children[j];

        if (childToken.type === "image") {
          const title = childToken.attrGet("title");

          if (title === "custom-emoji") {
            const emojiName = childToken.content || "";
            const emojiUrl = childToken.attrGet("src") || "";

            const emojiToken = new state.Token("emoji", "", 0);
            emojiToken.markup = emojiName;
            emojiToken.attrSet("data-name", emojiName);
            emojiToken.attrSet("data-url", emojiUrl);

            token.children[j] = emojiToken;
          }
        }
      }
    }
  }

  return false;
}

export default function emoji(md: MarkdownIt) {
  md.core.ruler.after("inline", "custom_emoji", customEmojiRule);

  // Ideally this would be an empty object, but due to a bug in markdown-it-emoji
  // passing an empty object results in newlines becoming emojis. Until this is
  // fixed at least one key is required. See:
  // https://github.com/markdown-it/markdown-it-emoji/issues/46
  const noMapping = {
    no_name_mapping: "💯",
  };

  return emojiPlugin(md, {
    defs: (md.options as Options).emoji === false ? noMapping : nameToEmoji,
    shortcuts: {},
  });
}
