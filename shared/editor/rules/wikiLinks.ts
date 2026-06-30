import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import { v4 as uuidv4 } from "uuid";
import { MentionType } from "../../types";

const LeftBracket = 0x5b; // [
const Bang = 0x21; // !

/** Extensions rendered inline as images. */
const ImageExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
  "avif",
]);

/** Extensions treated as file attachments rather than documents. */
const FileExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "key",
  "pages",
  "numbers",
  "zip",
  "csv",
  "txt",
  "mp3",
  "wav",
  "ogg",
  "m4a",
  "flac",
  "mp4",
  "mov",
  "webm",
  "mkv",
]);

/**
 * Returns the lowercased file extension of a wikilink target, or an empty
 * string when the target has no extension (i.e. it names a document).
 */
function extensionOf(target: string): string {
  const base = target.split("/").pop() ?? target;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/**
 * Splits a wikilink body into its link target and display label, dropping any
 * `#heading` / `#^block` anchor (which has no Outline equivalent).
 */
function parseTarget(inner: string): { target: string; label: string } {
  const pipe = inner.indexOf("|");
  const rawTarget = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim();
  const alias = pipe >= 0 ? inner.slice(pipe + 1).trim() : "";
  const target = rawTarget.split("#")[0].trim();
  return { target, label: alias || target };
}

/**
 * Inline rule that recognises Obsidian-style wikilinks and embeds and converts
 * them — purely syntactically — into the editor's existing token types:
 *
 * - `[[Note]]` / `[[Note|alias]]` → a `mention` token (the target name is held
 *   in `modelId` for a later, context-aware pass to resolve to a document id).
 * - `![[image.png]]` → an `image` token pointing at the raw target.
 * - `[[file.pdf]]`, `![[file.pdf]]` → a link to the raw target.
 *
 * Resolution of those raw targets to real documents / attachments is
 * intentionally left to the caller, since it requires knowledge (the set of
 * imported documents and attachments) that is not available while parsing a
 * single page.
 */
function wikiLink(state: StateInline, silent: boolean): boolean {
  const pos = state.pos;
  const isEmbed = state.src.charCodeAt(pos) === Bang;
  const open = isEmbed ? pos + 1 : pos;

  if (
    state.src.charCodeAt(open) !== LeftBracket ||
    state.src.charCodeAt(open + 1) !== LeftBracket
  ) {
    return false;
  }

  const close = state.src.indexOf("]]", open + 2);
  if (close < 0) {
    return false;
  }

  const inner = state.src.slice(open + 2, close);
  if (!inner.trim() || inner.includes("[") || inner.includes("\n")) {
    return false;
  }

  if (!silent) {
    const { target, label } = parseTarget(inner);
    const ext = extensionOf(target);

    if (isEmbed && ImageExtensions.has(ext)) {
      const token = state.push("image", "img", 0);
      token.attrSet("src", target);
      token.attrSet("alt", label);
      token.content = label;
      token.children = [];
    } else if (ImageExtensions.has(ext) || FileExtensions.has(ext)) {
      const linkOpen = state.push("link_open", "a", 1);
      linkOpen.attrSet("href", target);
      const text = state.push("text", "", 0);
      text.content = label;
      state.push("link_close", "a", -1);
    } else {
      const token = state.push("mention", "", 0);
      token.attrSet("id", uuidv4());
      token.attrSet("type", MentionType.Document);
      token.attrSet("modelId", target);
      token.content = label;
    }
  }

  state.pos = close + 2;
  return true;
}

/**
 * Markdown-it plugin that parses Obsidian wikilinks and embeds. Because it runs
 * as an inline rule it naturally ignores `[[…]]` inside code spans and fenced
 * code blocks.
 *
 * @param md The markdown-it instance to extend.
 */
export default function wikiLinks(md: MarkdownIt) {
  md.inline.ruler.before("image", "wiki_link", wikiLink);
}
