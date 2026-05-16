import path from "node:path";
import { escapeRegExp } from "es-toolkit/compat";
import { Buckets } from "@server/models/helpers/AttachmentHelper";

export interface AttachmentRef {
  /** Pre-assigned attachment id. */
  id: string;
  /** Path of the attachment within the zip archive. */
  pathInZip: string;
}

/**
 * Rewrites local attachment paths in markdown text into `<<attachmentId>>`
 * placeholders. Supports legacy bucket layouts (`uploads/`, `public/`),
 * arbitrary nested folder names, and `./attachments/...` rooted paths. Both
 * encoded and unencoded path forms are matched.
 *
 * @param markdown The raw markdown text from a single document.
 * @param attachments Attachment manifest entries to substitute.
 * @returns Markdown text with local paths replaced by `<<id>>` references.
 */
export function rewriteAttachmentPaths(
  markdown: string,
  attachments: AttachmentRef[]
): string {
  let text = markdown;

  for (const attachment of attachments) {
    const encodedPath = encodeURI(attachment.pathInZip);
    const attachmentFileName = path.basename(attachment.pathInZip);
    const reference = `<<${attachment.id}>>`;

    // Pull the collection and subdirectory out of the path name, upload
    // folders in an export are relative to the document itself. Support both
    // legacy bucket names (uploads/public) and generic attachment folders.
    const normalizedAttachmentPath = encodedPath
      .replace(new RegExp(`(.*)/${Buckets.uploads}/`), `${Buckets.uploads}/`)
      .replace(new RegExp(`(.*)/${Buckets.public}/`), `${Buckets.public}/`);

    // Also try normalizing to just the folder containing the attachment.
    // This handles arbitrary folder names like "attachments/".
    const attachmentDir = path.basename(path.dirname(attachment.pathInZip));
    const genericNormalizedPath = `${attachmentDir}/${encodeURI(attachmentFileName)}`;

    text = text
      .replace(new RegExp(escapeRegExp(encodedPath), "g"), reference)
      .replace(
        new RegExp(`\\.?/?${escapeRegExp(normalizedAttachmentPath)}`, "g"),
        reference
      );

    // Handle markdown links that reference attachments via a path rooted at
    // an "attachments" folder, optionally prefixed with "./". This is more
    // specific than the generic single-parent-dir fallback below, so try it
    // first to avoid partial matches against deeply-nested attachment paths.
    const segments = attachment.pathInZip.split(path.sep);
    const attachmentsIdx = segments.findIndex(
      (seg) => seg.toLowerCase() === "attachments"
    );
    if (attachmentsIdx >= 0) {
      const relFromAttachments = segments.slice(attachmentsIdx).join("/");
      text = text.replace(
        new RegExp(`\\.?/?${escapeRegExp(encodeURI(relFromAttachments))}`, "g"),
        reference
      );
    }

    text = text.replace(
      new RegExp(`\\.?/?${escapeRegExp(genericNormalizedPath)}`, "g"),
      reference
    );
  }

  return text;
}

/**
 * Rewrites internal markdown links (`[label](./relative.md)`) into
 * `<<documentId>>` placeholders, resolved against a path → id map built from
 * the zip's full document tree.
 *
 * @param markdown The raw markdown text from a single document.
 * @param documentPath Absolute path of the document being rewritten; used to
 *                     resolve relative link targets.
 * @param docMap Map of document path (as it appeared in the zip) to its
 *               pre-assigned externalId.
 * @returns Markdown text with internal `.md` link targets replaced by
 *          `<<id>>` references.
 */
export function rewriteInternalLinks(
  markdown: string,
  documentPath: string,
  docMap: Record<string, string>
): string {
  const basePath = path.dirname(documentPath);
  const internalLinks = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/g)];

  let text = markdown;
  for (const match of internalLinks) {
    const referredDocPath = match[1];
    const normalizedDocPath = decodeURI(
      path.normalize(`${basePath}/${referredDocPath}`)
    );

    const referredDocId = docMap[normalizedDocPath];
    if (referredDocId) {
      text = text.replace(referredDocPath, `<<${referredDocId}>>`);
    }
  }

  return text;
}
