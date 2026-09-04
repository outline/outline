import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";
import { v4 as uuidv4 } from "uuid";
import { MentionType } from "../../types";
import parseMentionUrl from "@shared/utils/parseMentionUrl";
import { sanitizeUrl } from "@shared/utils/urls";

/**
 * Check whether a URL is a valid mention:// href.
 *
 * @param href the URL string to test.
 * @returns true when the href is a recognised mention URL.
 */
function isMentionHref(href: string) {
  const { mentionType, modelId } = parseMentionUrl(href);
  return mentionType !== undefined && modelId !== undefined;
}

/**
 * Parse an href that points at an external resource that can be represented as
 * a mention.
 *
 * @param href the URL string to parse.
 * @returns the parsed URL, or undefined when the href cannot be mentioned.
 */
function parseExternalHref(href: string): URL | undefined {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse a mention:// href into the id, type and modelId needed by the editor.
 * For 2-segment URLs (no instance id) a fresh UUID is generated.
 *
 * @param href the mention URL to parse.
 * @returns the parsed components.
 * @throws when the href is not a valid mention URL.
 */
function parseMentionHref(href: string): {
  id: string;
  type: string;
  modelId: string;
} {
  const { id, mentionType, modelId } = parseMentionUrl(href);

  if (!mentionType || !modelId) {
    throw new Error(`Invalid mention href: ${href}`);
  }

  return { id: id ?? uuidv4(), type: mentionType, modelId };
}

const renderMention = (md: MarkdownIt) => (tokens: Token[], idx: number) => {
  // The label and attributes originate in the document, and markdown-it leaves
  // any markup in them intact when `html` is disabled, so everything written
  // into the tag is escaped here.
  const esc = (value: string | null) => md.utils.escapeHtml(value ?? "");

  const id = esc(tokens[idx].attrGet("id"));
  const mType = esc(tokens[idx].attrGet("type"));
  const mId = esc(tokens[idx].attrGet("modelId"));
  const href = tokens[idx].attrGet("href");
  const label = esc(tokens[idx].content);

  return href
    ? `<a id="${id}" class="mention" href="${esc(sanitizeUrl(href) ?? "")}" data-type="${mType}" data-id="${mId}">${label}</a>`
    : `<span id="${id}" class="mention" data-type="${mType}" data-id="${mId}">${label}</span>`;
};

function parseMentions(state: StateCore) {
  for (let i = 0; i < state.tokens.length; i++) {
    const tok = state.tokens[i];
    if (!(tok.type === "inline" && tok.children)) {
      continue;
    }

    const canChunkComposeMentionToken = (chunk: Token[]) => {
      // no group of tokens of size less than 4 can compose a mention token
      if (chunk.length < 4) {
        return false;
      }

      const [precToken, openToken, textToken, closeToken] = chunk;

      // check for the valid order of tokens required to compose a mention token
      if (
        !(
          precToken.type === "text" &&
          precToken.content &&
          precToken.content.endsWith("@") &&
          openToken.type === "link_open" &&
          textToken.content &&
          closeToken.type === "link_close"
        )
      ) {
        return false;
      }

      // "link_open" token should have a mention:// href, or an external href
      // that can be represented as a mention.
      const attr = openToken.attrs?.[0];
      if (
        !(
          attr &&
          attr[0] === "href" &&
          (isMentionHref(attr[1]) || parseExternalHref(attr[1]))
        )
      ) {
        return false;
      }

      // can probably compose a mention token if arrived here
      return true;
    };

    const chunkWithMentionToken = (chunk: Token[]) => {
      const [precToken, openToken, textToken] = chunk;

      // remove "@" from preceding token
      precToken.content = precToken.content.slice(0, -1);

      // href must be present, otherwise the href test would've failed
      // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion
      const href = openToken.attrs![0][1];
      const mentionToken = new state.Token("mention", "", 0);
      const externalUrl = isMentionHref(href)
        ? undefined
        : parseExternalHref(href);

      if (externalUrl) {
        // External links carry their identity in the href, so the ids are
        // generated the same way a paste in the editor would. The mention is
        // generic here and is narrowed to the resource it points at by the
        // service that recognizes the URL.
        mentionToken.attrSet("id", uuidv4());
        mentionToken.attrSet("type", MentionType.URL);
        mentionToken.attrSet("modelId", uuidv4());
        mentionToken.attrSet("href", href);
      } else {
        const { id, type: mType, modelId: mId } = parseMentionHref(href);
        mentionToken.attrSet("id", id);
        mentionToken.attrSet("type", mType);
        mentionToken.attrSet("modelId", mId);
      }

      mentionToken.content = textToken.content;

      // "link_open", followed by "text" and "link_close" tokens are coalesced
      // into "mention" token, hence removed
      return [precToken, mentionToken];
    };

    let newChildren: Token[] = [];
    let j = 0;
    while (j < tok.children.length) {
      // attempt to grab next four tokens that could potentially construct a mention token
      const chunk = tok.children.slice(j, j + 4);
      if (canChunkComposeMentionToken(chunk)) {
        newChildren = newChildren.concat(chunkWithMentionToken(chunk));
        // skip by 4 since mention token for this group of tokens has been composed
        // and the group cannot compose mention tokens any further
        j += 4;
      } else {
        // push the tokens which do not participate in composing a mention token as it is
        newChildren.push(tok.children[j]);
        j++;
      }
    }

    state.tokens[i].children = newChildren;
  }
}

export default function mention(md: MarkdownIt) {
  md.renderer.rules.mention = renderMention(md);
  md.core.ruler.after("inline", "mention", parseMentions);
}
