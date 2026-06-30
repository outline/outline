import { MentionType } from "@shared/types";
import type { ProsemirrorData, ProsemirrorMark } from "@shared/types";

export interface ResolveWikiLinksOptions {
  /**
   * Resolves a wikilink document target (a note name or path) to the imported
   * document's externalId, or undefined when no document matches.
   */
  resolveDocument: (target: string) => string | undefined;
  /**
   * Resolves an attachment target (a file name) to the href that should be
   * used to reference it, or undefined when no attachment matches.
   */
  resolveAttachment: (target: string) => string | undefined;
}

/**
 * Resolves the raw wikilink targets left behind by the `wikiLinks` markdown-it
 * rule, using the import's full set of documents and attachments.
 *
 * - Document mentions carry the wiki target in `modelId`; it is replaced with
 *   the document's externalId, or the mention is demoted to plain text when the
 *   target does not resolve.
 * - Image `src` and link `href` values that name an attachment are rewritten to
 *   the attachment's href; non-matching values (real URLs, already-resolved
 *   references) are left untouched.
 *
 * @param content The converted Prosemirror document.
 * @param options Callbacks that resolve targets against the import's contents.
 * @returns A new Prosemirror document with wikilink targets resolved.
 */
export function resolveWikiLinks(
  content: ProsemirrorData,
  options: ResolveWikiLinksOptions
): ProsemirrorData {
  const transform = (node: ProsemirrorData): ProsemirrorData => {
    if (
      node.type === "mention" &&
      node.attrs?.type === MentionType.Document &&
      typeof node.attrs.modelId === "string"
    ) {
      const externalId = options.resolveDocument(node.attrs.modelId);
      if (externalId) {
        return { ...node, attrs: { ...node.attrs, modelId: externalId } };
      }
      const label =
        typeof node.attrs.label === "string"
          ? node.attrs.label
          : node.attrs.modelId;
      return { type: "text", text: label };
    }

    let next = node;

    if (node.type === "image" && typeof node.attrs?.src === "string") {
      const href = options.resolveAttachment(node.attrs.src);
      if (href) {
        next = { ...next, attrs: { ...next.attrs, src: href } };
      }
    }

    if (next.marks?.length) {
      next = { ...next, marks: next.marks.map(transformMark) };
    }

    if (next.content?.length) {
      next = { ...next, content: next.content.map(transform) };
    }

    return next;
  };

  const transformMark = (mark: ProsemirrorMark): ProsemirrorMark => {
    if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      const href = options.resolveAttachment(mark.attrs.href);
      if (href) {
        return { ...mark, attrs: { ...mark.attrs, href } };
      }
    }
    return mark;
  };

  return transform(content);
}
