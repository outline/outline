import type MarkdownIt from "markdown-it";

const hrefRegex =
  /^database:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$/i;

/**
 * A markdown-it plugin that converts a paragraph containing a single link of
 * the form `[…](database://<collectionId>[/<viewId>])` into a database block
 * token, the serialized representation of the inline database node.
 */
export default function databases(md: MarkdownIt) {
  md.core.ruler.after("inline", "databases", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length - 1; i++) {
      if (
        tokens[i].type !== "inline" ||
        tokens[i - 1]?.type !== "paragraph_open"
      ) {
        continue;
      }

      const children = tokens[i].children || [];
      const [open, , close] = children;
      if (
        children.length !== 3 ||
        open?.type !== "link_open" ||
        close?.type !== "link_close"
      ) {
        continue;
      }

      const match = (open.attrGet("href") || "").match(hrefRegex);
      if (!match) {
        continue;
      }

      const token = new state.Token("database", "div", 0);
      token.attrSet("collectionId", match[1]);
      if (match[2]) {
        token.attrSet("viewId", match[2]);
      }

      // replace the paragraph_open, inline and paragraph_close tokens
      tokens.splice(i - 1, 3, token);
    }

    return false;
  });
}

/**
 * Builds the link href used to serialize a database block to markdown.
 *
 * @param collectionId the collection the block renders.
 * @param viewId the saved view to apply, if any.
 * @returns the serialized href.
 */
export function databaseHref(collectionId: string, viewId?: string | null) {
  return `database://${collectionId}${viewId ? `/${viewId}` : ""}`;
}

/**
 * Parses a database block href back into its attributes.
 *
 * @param href the serialized href.
 * @returns the collection and view ids, or undefined when not a database href.
 */
export function parseDatabaseHref(
  href: string
): { collectionId: string; viewId: string | null } | undefined {
  const match = href.match(hrefRegex);
  return match
    ? { collectionId: match[1], viewId: match[2] ?? null }
    : undefined;
}
