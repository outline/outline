import path from "node:path";
import type { Node } from "prosemirror-model";
import { Fragment } from "prosemirror-model";
import type { IntegrationService } from "@shared/types";
import slugify from "@shared/utils/slugify";
import type { ImportTask } from "@server/models";
import MarkdownAPIImportTask from "@server/queues/tasks/MarkdownAPIImportTask";
import { deserializeFilename } from "@server/utils/fs";
import type { ZipTreeNode } from "@server/utils/ZipHelper";

// Supertype of the base task's generic so the `scheduleNextTask` override
// remains a valid override of MarkdownAPIImportTask's Markdown-typed method.
type Service = IntegrationService.Markdown | IntegrationService.Slab;

/**
 * Gets the slug of the post that a Slab post URL points to, e.g.
 * `https://team.slab.com/posts/my-post-title-w7rkjimy` gives "my-post-title".
 * The last hyphenated segment is the post id and is removed. Slab writes
 * post mentions as links that have only the post id, e.g.
 * `https://team.slab.com/posts/w7rkjimy`; for these the slug comes from the
 * link label, which is the post title.
 *
 * @param href The link destination.
 * @param label The link label.
 * @returns The slug, or undefined when the URL is not a Slab post link.
 */
export function slugFromPostUrl(href: string, label = ""): string | undefined {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }

  if (!url.hostname.endsWith(".slab.com")) {
    return undefined;
  }

  const match = url.pathname.match(/^\/posts\/([^/]+)\/?$/);
  if (!match) {
    return undefined;
  }

  let segment: string;
  try {
    segment = decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }

  const idIndex = segment.lastIndexOf("-");

  // Slugify again so the result matches slugified document titles, e.g.
  // when Slab keeps an emoji or accented letter in the slug.
  return slugify(idIndex > 0 ? segment.slice(0, idIndex) : label) || undefined;
}

/**
 * Removes the hyphens from a slug before slugs are compared. Slab puts a
 * hyphen between letters and digits ("Q3 Roadmap" gives "q-3-roadmap") and
 * slugify does not ("q3-roadmap").
 *
 * @param slug The slug.
 * @returns The slug without hyphens.
 */
function unhyphenate(slug: string): string {
  return slug.replace(/-/g, "");
}

/**
 * Whether a URL points at a file hosted by Slab. Uploaded files are served
 * from Slab's static hosts, or from the team's own subdomain with a signed
 * `jwt` query parameter.
 *
 * @param href The link destination.
 * @returns true when the URL is a Slab-hosted file.
 */
export function isSlabFileUrl(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return false;
  }

  const host = url.hostname;
  if (
    host === "slabstatic.com" ||
    host.endsWith(".slabstatic.com") ||
    host === "static.slab.com"
  ) {
    return true;
  }

  return host.endsWith(".slab.com") && url.searchParams.has("jwt");
}

/**
 * Converts links to Slab-hosted files into attachment nodes so the import
 * pipeline downloads and re-hosts them. A paragraph's file links are added as
 * attachment blocks after it. When the paragraph holds other content, the
 * link text stays in it as plain text; otherwise the paragraph is removed.
 *
 * @param doc The converted ProseMirror document.
 * @returns The document with Slab file links replaced by attachments.
 */
export function convertSlabFileLinks(doc: Node): Node {
  const { schema } = doc.type;
  const attachmentType = schema.nodes.attachment;
  const linkType = schema.marks.link;
  if (!attachmentType || !linkType) {
    return doc;
  }

  const transformParagraph = (node: Node): Node[] => {
    // Link text by href, so a link split over several text nodes (e.g. by
    // bold text) gives one attachment.
    const files = new Map<string, string>();
    const remaining: Node[] = [];
    let hasOtherContent = false;

    node.content.forEach((child) => {
      const link = child.isText ? linkType.isInSet(child.marks) : undefined;
      const href = link ? String(link.attrs.href ?? "") : "";

      if (!link || !isSlabFileUrl(href)) {
        remaining.push(child);
        hasOtherContent ||= !child.isText || !!child.text?.trim();
        return;
      }

      const text = child.text ?? "";
      files.set(href, (files.get(href) ?? "") + text);

      const marks = link.removeFromSet(child.marks);
      remaining.push(
        text.trim() === href
          ? schema.text(attachmentTitle("", href), marks)
          : child.mark(marks)
      );
    });

    if (files.size === 0) {
      return [node];
    }

    const attachments = Array.from(files, ([href, text]) =>
      attachmentType.create({
        href,
        title: attachmentTitle(text, href),
        size: 0,
      })
    );

    return hasOtherContent
      ? [node.copy(Fragment.fromArray(remaining)), ...attachments]
      : attachments;
  };

  const transformContent = (parent: Node): Fragment => {
    const nodes: Node[] = [];

    parent.content.forEach((node) => {
      if (node.type.name === "paragraph") {
        nodes.push(...transformParagraph(node));
      } else {
        nodes.push(node.isLeaf ? node : node.copy(transformContent(node)));
      }
    });

    // Some containers require a leading paragraph (e.g. a toggle block's
    // summary), keep the original content when the result is not valid.
    const content = Fragment.fromArray(nodes);
    return parent.type.validContent(content) ? content : parent.content;
  };

  return doc.copy(transformContent(doc));
}

function attachmentTitle(text: string, href: string): string {
  let fileName = "";
  try {
    fileName = decodeURIComponent(path.posix.basename(new URL(href).pathname));
  } catch {
    // Use the link text or the default title.
  }

  const trimmed = text.trim();
  if (!trimmed || trimmed === href) {
    return fileName || "attachment";
  }

  // Keep the file extension when the link text has none, e.g. "org chart".
  const ext = path.extname(fileName);
  return ext && !path.extname(trimmed) ? `${trimmed}${ext}` : trimmed;
}

/**
 * Imports a Slab workspace export.
 *
 * Slab exports the same zip-of-Markdown structure as Outline's own Markdown
 * export, so conversion, attachment, and persistence logic is inherited from
 * {@link MarkdownAPIImportTask}. This subclass handles the quirks of Slab's
 * export: the wrapping root directory, filename-held titles, links between
 * posts that point back at Slab, and file attachments hosted on Slab.
 */
export default class SlabAPIImportTask extends MarkdownAPIImportTask {
  protected async scheduleNextTask(
    importTask: ImportTask<Service>
  ): Promise<void> {
    await new SlabAPIImportTask().schedule({ importTaskId: importTask.id });
  }

  /**
   * Slab exports wrap the entire workspace in a single root directory named
   * "slab". When present, descend into it so the directories one level down
   * are imported as collections rather than a single "slab" collection.
   *
   * @param nodes The archive's top-level tree nodes.
   * @returns The nodes to import as collections.
   */
  protected resolveCollectionRootNodes(nodes: ZipTreeNode[]): ZipTreeNode[] {
    if (
      nodes.length === 1 &&
      nodes[0].children.length > 0 &&
      nodes[0].title.toLowerCase() === "slab"
    ) {
      return nodes[0].children;
    }
    return nodes;
  }

  /**
   * Slab does not treat a document's first heading as its title — the
   * filename is authoritative. Keep the leading heading as body content.
   *
   * @returns false so the leading heading is preserved in the document body.
   */
  protected shouldExtractTitleFromHeading(): boolean {
    return false;
  }

  /**
   * Slab exports links between posts as absolute URLs into the Slab
   * workspace. The export has no post ids, so the slug in the link is
   * compared with the slugified titles of the documents in the archive.
   *
   * @param href The link destination as written in the markdown.
   * @param label The link label as written in the markdown.
   * @param docMap Map of document path in the zip to its externalId.
   * @returns The externalId of the linked document, or undefined.
   */
  protected resolveLinkedDocument(
    href: string,
    label: string,
    docMap: Record<string, string>
  ): string | undefined {
    const slug = slugFromPostUrl(href, label);
    return slug
      ? this.documentsBySlug(docMap).get(unhyphenate(slug))
      : undefined;
  }

  protected transformDocument(doc: Node): Node {
    return convertSlabFileLinks(doc);
  }

  private slugIndexes = new WeakMap<
    Record<string, string>,
    Map<string, string>
  >();

  /**
   * Map of slugified document title to externalId, built once per docMap.
   * Slugs are stored without hyphens, see {@link unhyphenate}. When two
   * documents have the same slug, the first in the tree is used.
   */
  private documentsBySlug(docMap: Record<string, string>): Map<string, string> {
    let index = this.slugIndexes.get(docMap);
    if (index) {
      return index;
    }

    index = new Map();
    for (const [pathInZip, id] of Object.entries(docMap)) {
      const slug = unhyphenate(
        slugify(deserializeFilename(path.parse(pathInZip).name))
      );
      if (slug && !index.has(slug)) {
        index.set(slug, id);
      }
    }

    this.slugIndexes.set(docMap, index);
    return index;
  }
}
