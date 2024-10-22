import MarkdownIt, { Token } from "markdown-it";
import { EmbedDescriptor } from "../embeds";

function isParagraph(token: Token) {
  return token?.type === "paragraph_open";
}

function isLinkOpen(token: Token) {
  return token.type === "link_open";
}

function isLinkClose(token: Token) {
  return token.type === "link_close";
}

export default function linksToEmbeds(embeds: EmbedDescriptor[]) {
  function isEmbed(token: Token, link: Token) {
    const href = link.attrs ? link.attrs[0][1] : "";
    const simpleLink = href === token.content;

    if (!simpleLink) {
      return false;
    }
    if (!embeds) {
      return false;
    }

    for (const embed of embeds) {
      if (!embed.matchOnInput) {
        continue;
      }
      const matches = embed.matcher(href);
      if (matches) {
        return {
          ...embed,
          matches,
        };
      }
    }

    return false;
  }

  return function markdownEmbeds(md: MarkdownIt) {
    md.core.ruler.after("inline", "embeds", (state) => {
      const tokens = state.tokens;
      let insideLink;

      for (let i = 0; i < tokens.length - 1; i++) {
        // once we find a paragraph, look through it's children for links
        if (isParagraph(tokens[i - 1])) {
          const tokenChildren = tokens[i].children || [];

          for (let j = 0; j < tokenChildren.length - 1; j++) {
            const current = tokenChildren[j];
            if (!current) {
              continue;
            }

            if (isLinkOpen(current)) {
              insideLink = current;
              continue;
            }

            if (isLinkClose(current)) {
              insideLink = null;
              continue;
            }

            // of hey, we found a link – lets check to see if it should be
            // converted to an embed
            if (insideLink) {
              const result = isEmbed(current, insideLink);
              if (result) {
                const { content } = current;

                // convert to embed token
                const token = new state.Token("embed", "iframe", 0);
                token.attrSet("href", content);

                // delete the inline link – this makes the assumption that the
                // embed is the only thing in the para.
                tokens.splice(i - 1, 3, token);
                break;
              }
            }
          }
        }
      }

      return false;
    });
  };
}
