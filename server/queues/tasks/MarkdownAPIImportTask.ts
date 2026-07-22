import path from "node:path";
import { randomUUID } from "node:crypto";
import { escapeRegExp, truncate } from "es-toolkit/compat";
import mime from "mime-types";
import { UniqueConstraintError } from "sequelize";
import { CollectionValidation, DocumentValidation } from "@shared/validations";
import type {
  ImportTaskInput,
  ImportTaskOutput,
  MarkdownAttachmentManifestItem,
  MarkdownPageImportTaskInputItem,
} from "@shared/schema";
import type { IntegrationService, ProsemirrorDoc } from "@shared/types";
import { AttachmentPreset } from "@shared/types";
import attachmentCreator from "@server/commands/attachmentCreator";
import { createContext } from "@server/context";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import type { ImportTask } from "@server/models";
import { Attachment } from "@server/models";
import AttachmentHelper, {
  Buckets,
} from "@server/models/helpers/AttachmentHelper";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { sequelize } from "@server/storage/database";
import FileStorage from "@server/storage/files";
import type { ZipTreeNode } from "@server/utils/ZipHelper";
import ZipHelper from "@server/utils/ZipHelper";
import type { ProcessOutput } from "./APIImportTask";
import APIImportTask from "./APIImportTask";
import { DocumentConverter } from "@server/utils/DocumentConverter";

type Markdown = IntegrationService.Markdown;

interface DiscoveredDocument {
  id: string;
  title: string;
  pathInZip: string;
  collectionId: string;
  parentDocumentId?: string;
  markdownText: string;
  children: DiscoveredDocument[];
}

interface DiscoveredCollection {
  id: string;
  title: string;
  children: DiscoveredDocument[];
}

interface AttachmentRef {
  id: string;
  pathInZip: string;
}

/**
 * Rewrites local attachment paths in markdown text into `<<attachmentId>>`
 * placeholders. Supports legacy bucket layouts (`uploads/`, `public/`),
 * arbitrary nested folder names, and `./attachments/...` rooted paths. Both
 * encoded and unencoded path forms are matched.
 *
 * Exported for tests; not part of the module's public surface.
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

    const normalizedAttachmentPath = encodedPath
      .replace(new RegExp(`(.*)/${Buckets.uploads}/`), `${Buckets.uploads}/`)
      .replace(new RegExp(`(.*)/${Buckets.public}/`), `${Buckets.public}/`);

    const attachmentDir = path.basename(path.dirname(attachment.pathInZip));
    const genericNormalizedPath = `${attachmentDir}/${encodeURI(attachmentFileName)}`;

    text = text
      .replace(new RegExp(escapeRegExp(encodedPath), "g"), reference)
      .replace(
        new RegExp(`\\.?/?${escapeRegExp(normalizedAttachmentPath)}`, "g"),
        reference
      );

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
 * Exported for tests; not part of the module's public surface.
 *
 * @param markdown The raw markdown text from a single document.
 * @param documentPath Zip-relative path of the document being rewritten
 *                     (e.g. `Collection/parent.md`); used as the base for
 *                     resolving relative link targets against docMap keys.
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

export default class MarkdownAPIImportTask extends APIImportTask<Markdown> {
  protected shouldUploadAttachmentsPerPage(): boolean {
    // Per-page upload downloads remote image/attachment URLs referenced in
    // the markdown (e.g. Slab's signed export URLs) and rewrites them to
    // internal redirect URLs. The base step skips URLs that are already
    // internal, so local zip attachments — rewritten to redirect URLs during
    // `rewriteMarkdown` and uploaded from the archive in
    // `onAllTasksCompleted` — pass through untouched.
    return true;
  }

  /**
   * Whether a document's leading H1 heading should be lifted out as its title
   * (and removed from the body). Outline's own Markdown export writes the
   * title as a leading H1, so this defaults to true. Sources where the
   * filename is authoritative and the first heading is real content (e.g.
   * Slab) override this to keep the heading in the body.
   *
   * @returns true to derive the title from a leading H1 heading.
   */
  protected shouldExtractTitleFromHeading(): boolean {
    return true;
  }

  protected async scheduleNextTask(importTask: ImportTask<Markdown>) {
    await new MarkdownAPIImportTask().schedule({ importTaskId: importTask.id });
  }

  protected async onAllTasksCompleted(
    lastImportTask: ImportTask<Markdown>
  ): Promise<void> {
    const scratch = lastImportTask.import.scratch;
    if (!scratch?.storageKey || !scratch.manifest?.length) {
      return;
    }

    const handle = await FileStorage.getFileHandle(scratch.storageKey);

    try {
      const createdBy = lastImportTask.import.createdBy;
      const manifestByPath = new Map<string, MarkdownAttachmentManifestItem>(
        scratch.manifest.map((item) => [item.pathInZip, item])
      );
      const maxAttachmentSize = AttachmentHelper.presetToMaxUploadSize(
        AttachmentPreset.DocumentAttachment
      );
      const seen = new Set<string>();

      await ZipHelper.walk(handle.path, async (entry) => {
        if (entry.isDirectory) {
          return;
        }
        // Normalize to match the bootstrap-phase pathInZip (segments rejoined
        // with `/`, no leading `./` or empty segments).
        const normalized = entry.fileName.split("/").filter(Boolean).join("/");
        const item = manifestByPath.get(normalized);
        if (!item) {
          return;
        }
        seen.add(item.pathInZip);
        const buffer = await entry.readBuffer(maxAttachmentSize);

        try {
          await sequelize.transaction(async (transaction) =>
            attachmentCreator({
              source: "import",
              preset: AttachmentPreset.DocumentAttachment,
              id: item.id,
              name: item.name,
              type: item.mimeType,
              buffer,
              user: createdBy,
              ctx: createContext({ user: createdBy, transaction }),
              fetchOptions: {
                timeout: env.FILE_STORAGE_IMPORT_TIMEOUT,
              },
            })
          );
        } catch (err) {
          // Each attachment commits in its own transaction, so a retry of
          // this hook can re-encounter ids that already landed. Treat the
          // unique-id collision as a no-op so the import remains resumable.
          if (err instanceof UniqueConstraintError) {
            return;
          }
          throw err;
        }
      });

      for (const item of scratch.manifest) {
        if (!seen.has(item.pathInZip)) {
          Logger.warn(
            `Markdown import attachment missing in zip, skipping: ${item.pathInZip}`
          );
        }
      }
    } finally {
      await handle.cleanup().catch(() => {});
    }
  }

  protected async processBootstrap(
    importTask: ImportTask<Markdown>
  ): Promise<ProcessOutput<Markdown>> {
    const storageKey = importTask.import.scratch?.storageKey;
    if (!storageKey) {
      throw new Error("Markdown import is missing scratch.storageKey");
    }

    const handle = await FileStorage.getFileHandle(storageKey);

    try {
      // Side map of pre-loaded markdown text keyed by tree node identity.
      // ZipHelper's tree carries only metadata; we capture text during the
      // single walk so the downstream pass doesn't have to re-open the zip.
      const markdownByNode = new Map<ZipTreeNode, string>();

      const tree = await ZipHelper.toFileTree(
        handle.path,
        async (node, entry) => {
          const ext = path.extname(node.name).toLowerCase();
          if (ext === ".md" || ext === ".markdown") {
            const buffer = await entry.readBuffer(
              DocumentValidation.maxStateLength
            );
            markdownByNode.set(node, buffer.toString("utf8"));
          }
        }
      );

      const rootNodes = this.resolveCollectionRootNodes(tree.children);

      if (rootNodes.length === 0) {
        throw new Error("Could not find valid content in zip file");
      }

      const collections: DiscoveredCollection[] = [];
      const manifest: MarkdownAttachmentManifestItem[] = [];
      // Loose markdown files that sit at the archive root rather than inside a
      // collection folder are gathered into a fallback collection below.
      const looseDocuments: ZipTreeNode[] = [];

      for (const node of rootNodes) {
        if (node.children.length === 0) {
          const ext = path.extname(node.name).toLowerCase();
          if (ext === ".md" || ext === ".markdown") {
            looseDocuments.push(node);
          } else {
            manifest.push({
              id: randomUUID(),
              name: node.name,
              pathInZip: node.pathInZip,
              mimeType: mime.lookup(node.name) || "application/octet-stream",
            });
          }
          continue;
        }

        if (this.isAttachmentFolder(node)) {
          this.collectAttachments(node, manifest);
          continue;
        }

        const collection: DiscoveredCollection = {
          id: randomUUID(),
          title: node.title,
          children: [],
        };
        collections.push(collection);

        this.collectDocumentsAndAttachments({
          children: node.children,
          collectionId: collection.id,
          out: collection.children,
          manifest,
          markdownByNode,
        });
      }

      if (looseDocuments.length > 0) {
        const collection: DiscoveredCollection = {
          id: randomUUID(),
          title: this.fallbackCollectionTitle(),
          children: [],
        };
        collections.push(collection);

        this.collectDocumentsAndAttachments({
          children: looseDocuments,
          collectionId: collection.id,
          out: collection.children,
          manifest,
          markdownByNode,
        });
      }

      // Build docMap (pathInZip -> externalId) for internal-link resolution.
      // Walk the full document tree to collect every doc id, since internal
      // markdown links can target any document regardless of depth.
      const docMap: Record<string, string> = {};
      const collectDocMap = (docs: DiscoveredDocument[]) => {
        for (const d of docs) {
          docMap[d.pathInZip] = d.id;
          collectDocMap(d.children);
        }
      };
      for (const c of collections) {
        collectDocMap(c.children);
      }

      // Replace (not append) anything past the create-time placeholder with
      // the freshly discovered collections so a retried bootstrap doesn't
      // accumulate duplicate entries with fresh UUIDs from a previous
      // partial run. ImportsProcessor's persistence pass treats these as
      // collections.
      const associatedImport = importTask.import;
      const placeholder = associatedImport.input[0];
      associatedImport.input = [
        placeholder,
        ...collections.map((c) => ({
          externalId: c.id,
          permission: placeholder.permission,
        })),
      ];

      associatedImport.scratch = { storageKey, manifest, docMap };
      await associatedImport.save();

      // Append collection placeholder items so ImportsProcessor iterates
      // them during the bootstrap row (the earliest createdAt) — that
      // guarantees collections land in the DB before any per-page document
      // references them.
      const collectionInputItems: MarkdownPageImportTaskInputItem[] =
        collections.map((c) => ({
          externalId: c.id,
          title: c.title,
          path: c.title,
          markdownText: "",
          attachmentMap: [],
        }));

      importTask.input = [importTask.input[0], ...collectionInputItems];

      const collectionOutputs: ImportTaskOutput = collections.map((c) => ({
        externalId: c.id,
        title: truncate(c.title, {
          length: CollectionValidation.maxNameLength,
        }),
        content: ProsemirrorDataHelper.getEmpty() as ProsemirrorDoc,
      }));

      // First wave of document tasks: only top-level docs in each collection.
      // Each carries its descendants in `children` and the per-page handler
      // re-emits them as the next wave of childTasksInput, producing a strict
      // depth-ordered cascade of ImportTask rows so parent FKs are always
      // satisfied at child-doc creation time.
      const childTasksInput: ImportTaskInput<Markdown> = collections.flatMap(
        (c) => c.children.map((d) => this.toPageInput(d, manifest))
      );

      return { taskOutput: collectionOutputs, childTasksInput };
    } finally {
      await handle.cleanup().catch(() => {});
    }
  }

  /**
   * Converts a discovered document subtree into a per-page task input,
   * recursively packing the doc's descendants into the `children` field so
   * each tree-depth runs as its own task wave.
   *
   * @param doc The discovered document, including its descendants.
   * @param manifest The full attachment manifest (used for per-page refs).
   * @returns A self-contained per-page task input.
   */
  private toPageInput(
    doc: DiscoveredDocument,
    manifest: MarkdownAttachmentManifestItem[]
  ): MarkdownPageImportTaskInputItem {
    return {
      externalId: doc.id,
      parentExternalId: doc.parentDocumentId,
      collectionExternalId: doc.collectionId,
      title: doc.title,
      path: doc.pathInZip,
      markdownText: doc.markdownText,
      attachmentMap: this.attachmentsReferencedBy(doc.markdownText, manifest),
      children: doc.children.length
        ? doc.children.map((c) => this.toPageInput(c, manifest))
        : undefined,
    };
  }

  protected async processPage(
    importTask: ImportTask<Markdown>
  ): Promise<ProcessOutput<Markdown>> {
    const taskOutput: ImportTaskOutput = [];
    const childTasksInput: MarkdownPageImportTaskInputItem[] = [];

    // docMap is stored once on scratch rather than embedded in each page's
    // input (see processBootstrap) — read it back here for link rewriting.
    const docMap = importTask.import.scratch?.docMap ?? {};

    const items = importTask.input as MarkdownPageImportTaskInputItem[];
    for (const item of items) {
      // Empty markdown short-circuits — used by collection placeholders so
      // ImportsProcessor sees their externalId paired with empty content and
      // builds a Collection rather than a Document. (Currently collections
      // are persisted via the bootstrap task itself, so this branch is only
      // a defensive fallback.)
      if (!item.markdownText) {
        taskOutput.push({
          externalId: item.externalId,
          title: truncate(item.title, {
            length: DocumentValidation.maxTitleLength,
          }),
          content: ProsemirrorDataHelper.getEmpty() as ProsemirrorDoc,
        });
      } else {
        const transformedMarkdown = this.rewriteMarkdown(item, docMap);
        const { doc, title, icon } = await DocumentConverter.convert(
          transformedMarkdown,
          path.basename(item.path),
          "text/markdown",
          { extractTitle: this.shouldExtractTitleFromHeading() }
        );

        taskOutput.push({
          externalId: item.externalId,
          title: truncate(title || item.title, {
            length: DocumentValidation.maxTitleLength,
          }),
          icon,
          content: doc.toJSON() as ProsemirrorDoc,
        });
      }

      // Cascade this doc's direct descendants as the next task wave. Their
      // ImportTask rows will be created after the current one returns, so
      // their createdAt is strictly later — guaranteeing parent-before-child
      // FK ordering during ImportsProcessor's persistence pass.
      if (item.children?.length) {
        childTasksInput.push(...item.children);
      }
    }

    return { taskOutput, childTasksInput };
  }

  /**
   * Pre-rewrites a page's markdown text. Internal `.md` links become mention
   * markdown so the editor parses them as Document mentions. Attachment paths
   * are first reduced to `<<id>>` placeholders by the shared rewriter, then
   * — distinct from the prosemirror-tree walk we used to do — substituted
   * with their final attachment redirect URLs in the markdown text. Doing
   * the resolution at the text layer avoids markdown-it parsing `<<id>>` as
   * an angle-bracket-wrapped URL (which produced broken image src attrs).
   *
   * @param page The per-page task input.
   * @param docMap Path → externalId map for internal link rewriting, shared
   *               across all pages via `Import.scratch`.
   * @returns Rewritten markdown text ready for DocumentConverter.
   */
  private rewriteMarkdown(
    page: MarkdownPageImportTaskInputItem,
    docMap: Record<string, string>
  ): string {
    let text = rewriteInternalLinks(page.markdownText, page.path, docMap);

    // Convert `[label](<<id>>)` links from rewriteInternalLinks into mention
    // markdown the editor recognises: `@[label](mention://<uuid>/document/<id>)`.
    text = text.replace(
      /\[([^\]]+)\]\(<<([^>]+)>>\)/g,
      (_full, label: string, externalId: string) =>
        `@[${label}](mention://${randomUUID()}/document/${externalId})`
    );

    text = rewriteAttachmentPaths(
      text,
      page.attachmentMap.map((m) => ({ id: m.id, pathInZip: m.pathInZip }))
    );

    // Resolve remaining `<<id>>` placeholders to attachment redirect URLs.
    text = text.replace(/<<([^>]+)>>/g, (_full, id: string) =>
      Attachment.getRedirectUrl(id)
    );

    return text;
  }

  /**
   * Returns the subset of the full manifest that is referenced anywhere in
   * the given markdown text. Used to bound the per-page task input size.
   *
   * @param markdown Raw markdown text for a single document.
   * @param manifest The full attachment manifest from the bootstrap phase.
   * @returns Manifest entries that appear (by filename) in the markdown.
   */
  private attachmentsReferencedBy(
    markdown: string,
    manifest: MarkdownAttachmentManifestItem[]
  ): MarkdownAttachmentManifestItem[] {
    return manifest.filter((item) => {
      const fileName = path.basename(item.pathInZip);
      return (
        markdown.includes(fileName) || markdown.includes(encodeURI(fileName))
      );
    });
  }

  /**
   * Resolves the archive's top-level entries into the nodes that should be
   * treated as collections. The base implementation uses the entries as-is;
   * subclasses can override to unwrap a known wrapper directory before the
   * bootstrap phase maps each node to a collection.
   *
   * @param nodes The archive's top-level tree nodes.
   * @returns The nodes to import as collections.
   */
  protected resolveCollectionRootNodes(nodes: ZipTreeNode[]): ZipTreeNode[] {
    return nodes;
  }

  /**
   * Title for the fallback collection that holds markdown files found loose at
   * the archive root (outside any collection folder). Subclasses can override
   * to give the collection a source-appropriate name.
   *
   * @returns The fallback collection title.
   */
  protected fallbackCollectionTitle(): string {
    return "Documents";
  }

  /**
   * Detects folders containing only attachments (no markdown documents).
   * Recursively considers nested folders; mirrors the legacy heuristic.
   *
   * @param node ZipTreeNode to inspect.
   * @returns true when the folder appears to hold only attachments.
   */
  private isAttachmentFolder(node: ZipTreeNode): boolean {
    if (node.children.length === 0) {
      return false;
    }
    if (node.title.toLowerCase() === "attachments") {
      return true;
    }
    return node.children.every((child) => {
      if (child.children.length > 0) {
        return this.isAttachmentFolder(child);
      }
      const ext = path.extname(child.name).toLowerCase();
      if (!ext) {
        return false;
      }
      return ext !== ".md" && ext !== ".markdown";
    });
  }

  /**
   * Recursively collects all files under an attachment-only folder into the
   * manifest. `pathInZip` is stored verbatim so the completion phase can find
   * the same entry when re-walking the archive.
   *
   * @param node Attachment-folder ZipTreeNode.
   * @param manifest Manifest array to push entries into.
   */
  private collectAttachments(
    node: ZipTreeNode,
    manifest: MarkdownAttachmentManifestItem[]
  ): void {
    for (const child of node.children) {
      if (child.children.length > 0) {
        this.collectAttachments(child, manifest);
        continue;
      }
      manifest.push({
        id: randomUUID(),
        name: child.name,
        pathInZip: child.pathInZip,
        mimeType: mime.lookup(child.name) || "application/octet-stream",
      });
    }
  }

  /**
   * Walks a collection subtree and gathers documents (markdown files) and
   * loose attachments. Documents are appended to `out` as a tree — each
   * entry's `children` holds its direct descendants. This is the shape the
   * per-page task cascade consumes.
   *
   * @param children ZipTreeNode children of the current folder.
   * @param collectionId Pre-assigned id of the enclosing collection.
   * @param parentDocumentId Optional parent document id when nested.
   * @param out Sibling accumulator to push discovered documents into.
   * @param manifest Attachment manifest accumulator.
   * @param markdownByNode Pre-loaded markdown text keyed by tree node.
   */
  private collectDocumentsAndAttachments({
    children,
    collectionId,
    parentDocumentId,
    out,
    manifest,
    markdownByNode,
  }: {
    children: ZipTreeNode[];
    collectionId: string;
    parentDocumentId?: string;
    out: DiscoveredDocument[];
    manifest: MarkdownAttachmentManifestItem[];
    markdownByNode: Map<ZipTreeNode, string>;
  }): void {
    for (const child of children) {
      if (child.children.length > 0 && this.isAttachmentFolder(child)) {
        this.collectAttachments(child, manifest);
        continue;
      }

      const ext = path.extname(child.name).toLowerCase();
      const isMarkdown = ext === ".md" || ext === ".markdown";
      const isFolder = child.children.length > 0;

      if (!isMarkdown && !isFolder) {
        manifest.push({
          id: randomUUID(),
          name: child.name,
          pathInZip: child.pathInZip,
          mimeType: mime.lookup(child.name) || "application/octet-stream",
        });
        continue;
      }

      const id = randomUUID();
      const markdownText = isFolder ? "" : (markdownByNode.get(child) ?? "");

      // Folder-and-file with the same title (a "name.md" alongside a "name/"
      // directory) is merged onto a single document: the folder body picks up
      // the file's markdown text, and the folder's contents become children.
      const sibling = out.find((d) => d.title === child.title);

      if (sibling) {
        if (sibling.markdownText === "" && markdownText) {
          sibling.markdownText = markdownText;
        }
        if (isFolder) {
          this.collectDocumentsAndAttachments({
            children: child.children,
            collectionId,
            parentDocumentId: sibling.id,
            out: sibling.children,
            manifest,
            markdownByNode,
          });
        }
        continue;
      }

      const node: DiscoveredDocument = {
        id,
        title: child.title,
        pathInZip: child.pathInZip,
        collectionId,
        parentDocumentId,
        markdownText,
        children: [],
      };
      out.push(node);

      if (isFolder) {
        this.collectDocumentsAndAttachments({
          children: child.children,
          collectionId,
          parentDocumentId: id,
          out: node.children,
          manifest,
          markdownByNode,
        });
      }
    }
  }
}
