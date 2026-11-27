import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import defaultEmbeds from "../embeds";
import { getMatchingEmbedOnInput } from "../lib/embeds";

/**
 * Reverse the escaping applied by Embed.toMarkdown, which writes underscores
 * as %5F so they cannot be read as emphasis.
 *
 * @param href the serialized href.
 * @returns the original URL.
 */
function unescapeHref(href: string) {
  return href.replace(/%5F/g, "_");
}

/**
 * Read the href out of an inline token that contains nothing but a link
 * labelled with its own URL — the shape Embed.toMarkdown produces.
 *
 * @param children the inline token's children.
 * @returns the href, or undefined when the token is any other shape.
 */
function selfLinkingHref(children: Token[]): string | undefined {
  if (children.length !== 3) {
    return undefined;
  }

  const [open, text, close] = children;
  if (
    open.type !== "link_open" ||
    text.type !== "text" ||
    close.type !== "link_close"
  ) {
    return undefined;
  }

  const href = open.attrGet("href");
  if (!href || text.content !== href) {
    return undefined;
  }

  return unescapeHref(href);
}

/**
 * Convert a paragraph holding a single self-linking URL back into an embed
 * token, so that embeds survive a markdown round-trip.
 *
 * Embed.parseMarkdown reads the href straight off this token.
 *
 * The descriptor list is the built-in one rather than the workspace's: the
 * parser also runs on the server, where there is no editor to read
 * `editor.props.embeds` from. An embed added by an integration therefore
 * round-trips to a plain link.
 *
 * @param md the markdown-it instance.
 */
export default function embedsToNodes(md: MarkdownIt) {
  // Appended to the end of the core chain rather than anchored after
  // "attachments": Embed is registered ahead of Attachment in richExtensions,
  // so that rule does not exist yet at this point. Pushing also means the
  // ordering does not silently change if the extension list is reordered.
  // The attachments rule inserts itself after "breaks", mid-chain, so it still
  // runs first — and its hrefs match no embed descriptor either way.
  md.core.ruler.push("embeds", (state) => {
    const tokens = state.tokens;

    // Walk backwards: replacing three tokens with one shifts every index above
    // the splice point.
    for (let i = tokens.length - 2; i > 0; i--) {
      if (
        tokens[i].type !== "inline" ||
        tokens[i - 1].type !== "paragraph_open" ||
        tokens[i + 1].type !== "paragraph_close"
      ) {
        continue;
      }

      const href = selfLinkingHref(tokens[i].children ?? []);
      if (!href) {
        continue;
      }

      if (!getMatchingEmbedOnInput(defaultEmbeds, href)) {
        continue;
      }

      const token = new state.Token("embed", "iframe", 0);
      token.attrSet("href", href);
      tokens.splice(i - 1, 3, token);
    }

    return false;
  });
}
