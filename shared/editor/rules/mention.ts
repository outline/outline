import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";
import { v4 as uuidv4 } from "uuid";
import isUUID from "validator/lib/isUUID";
import { MentionDisplay, MentionType } from "../../types";
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

/** Matches the links that document and collection mentions are written as. */
const internalHrefRegex = /^\/(doc|collection)\/([^/#?]+)(?:#(.+))?$/;

/**
 * Parse an href that points at a document or collection by id.
 *
 * @param href the URL string to parse.
 * @returns the mention type, model id and anchor, or undefined when the href
 * does not point at a document or collection by id.
 */
function parseInternalHref(
  href: string
): { type: MentionType; modelId: string; anchorId?: string } | undefined {
  const match = internalHrefRegex.exec(href);
  if (!match) {
    return undefined;
  }

  const [, kind, modelId, anchorId] = match;
  if (!isUUID(modelId)) {
    return undefined;
  }
  if (kind === "collection") {
    return anchorId ? undefined : { type: MentionType.Collection, modelId };
  }
  return { type: MentionType.Document, modelId, anchorId };
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
  const display =
    tokens[idx].attrGet("display") === MentionDisplay.Card
      ? ` data-display="${MentionDisplay.Card}"`
      : "";

  return href
    ? `<a id="${id}" class="mention" href="${esc(sanitizeUrl(href) ?? "")}" data-type="${mType}" data-id="${mId}"${display}>${label}</a>`
    : `<span id="${id}" class="mention" data-type="${mType}" data-id="${mId}"${display}>${label}</span>`;
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
          (isMentionHref(attr[1]) ||
            parseExternalHref(attr[1]) ||
            parseInternalHref(attr[1]))
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
      const href = openToken.attrs![0][1];
      const mentionToken = new state.Token("mention", "", 0);
      const isMention = isMentionHref(href);
      const internal = isMention ? undefined : parseInternalHref(href);
      const externalUrl =
        isMention || internal ? undefined : parseExternalHref(href);

      if (internal) {
        mentionToken.attrSet("id", uuidv4());
        mentionToken.attrSet("type", internal.type);
        mentionToken.attrSet("modelId", internal.modelId);
        if (internal.anchorId) {
          mentionToken.attrSet("anchorId", internal.anchorId);
        }
      } else if (externalUrl) {
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

      // The link title stores the display, so the URL is not changed.
      if (openToken.attrGet("title") === MentionDisplay.Card) {
        mentionToken.attrSet("display", MentionDisplay.Card);
      }

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
