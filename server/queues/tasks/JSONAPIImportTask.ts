import path from "node:path";
import { randomUUID } from "node:crypto";
import { Fragment, Node } from "prosemirror-model";
import { Op, UniqueConstraintError } from "sequelize";
import { isUUID } from "validator";
import type {
  ImportTaskInput,
  ImportTaskOutput,
  JSONAttachmentManifestItem,
  JSONEmojiManifestItem,
  JSONPageImportTaskInputItem,
} from "@shared/schema";
import type {
  IntegrationService,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import { AttachmentPreset } from "@shared/types";
import { errToString } from "@shared/utils/error";
import attachmentCreator from "@server/commands/attachmentCreator";
import { createContext } from "@server/context";
import { schema } from "@server/editor";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import type { ImportTask } from "@server/models";
import { Attachment, Emoji } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { sequelize } from "@server/storage/database";
import FileStorage from "@server/storage/files";
import type {
  AttachmentJSONExport,
  CollectionJSONExport,
  DocumentJSONExport,
  EmojiJSONExport,
  JSONExportMetadata,
} from "@server/types";
import ZipHelper from "@server/utils/ZipHelper";
import type { ProcessOutput } from "./APIImportTask";
import APIImportTask from "./APIImportTask";

type Service = IntegrationService.JSON;

const REDIRECT_URL_REGEX = /\/api\/attachments\.redirect\?id=([^&"'\s)]+)/g;
const ATTACHMENT_NODE_TYPES = ["attachment", "image", "video"];

interface DiscoveredDocument {
  externalId: string;
  parentExternalId?: string;
  collectionExternalId: string;
  export: DocumentJSONExport;
  children: DiscoveredDocument[];
}

/**
 * Rewrites `/api/attachments.redirect?id=<externalId>` references in a
 * ProseMirror document to point at the corresponding new attachment ids.
 * Operates on both `href` (attachment nodes) and `src` (image / video nodes).
 * Also updates the `id` attribute on attachment nodes so it lines up with the
 * created Attachment row. Unknown ids are left intact so a malformed export
 * cannot crash the importer.
 *
 * Exported for tests; not part of the module's public surface.
 *
 * @param content ProseMirror content from a document or collection.
 * @param attachmentIdMap Map of external attachment id → new internal id.
 * @returns ProseMirror content with rewritten attachment references.
 */
export function rewriteAttachmentReferences(
  content: ProsemirrorData,
  attachmentIdMap: Record<string, string>
): ProsemirrorData {
  const rewriteUrl = (url?: string): string | undefined => {
    if (!url) {
      return url;
    }
    return url.replace(REDIRECT_URL_REGEX, (full, externalId: string) => {
      const newId = attachmentIdMap[externalId];
      return newId ? Attachment.getRedirectUrl(newId) : full;
    });
  };

  const transformAttachmentNode = (node: Node): Node => {
    const json = node.toJSON() as ProsemirrorData;
    const attrs = { ...json.attrs };

    if (node.type.name === "attachment") {
      const href = attrs.href as string | undefined;
      attrs.href = rewriteUrl(href);

      // Keep `id` aligned with the rewritten URL so downstream consumers that
      // read the attachment id (e.g. size hydration in ImportsProcessor) can
      // resolve it via the new Attachment row.
      if (typeof attrs.id === "string" && attachmentIdMap[attrs.id]) {
        attrs.id = attachmentIdMap[attrs.id];
      } else if (typeof href === "string") {
        const match = /\/api\/attachments\.redirect\?id=([^&"'\s)]+)/.exec(
          href
        );
        if (match && attachmentIdMap[match[1]]) {
          attrs.id = attachmentIdMap[match[1]];
        }
      }
    } else if (node.type.name === "image" || node.type.name === "video") {
      attrs.src = rewriteUrl(attrs.src as string | undefined);
    }

    json.attrs = attrs;
    return Node.fromJSON(schema, json);
  };

  const transformFragment = (fragment: Fragment): Fragment => {
    const nodes: Node[] = [];
    fragment.forEach((node) => {
      nodes.push(
        ATTACHMENT_NODE_TYPES.includes(node.type.name)
          ? transformAttachmentNode(node)
          : node.copy(transformFragment(node.content))
      );
    });
    return Fragment.fromArray(nodes);
  };

  const doc = Node.fromJSON(schema, content);
  return doc.copy(transformFragment(doc.content)).toJSON() as ProsemirrorData;
}

/**
 * Rewrites inline custom emoji references in a ProseMirror document to the
 * emoji ids the import resolved them to. Emojis are addressed by id in the
 * `data-name` attribute; unicode emojis use a shortcode there instead and are
 * left alone, as are ids missing from the map.
 *
 * Exported for tests; not part of the module's public surface.
 *
 * @param content ProseMirror content from a document or collection.
 * @param emojiIdMap Map of external emoji id → new internal id.
 * @returns ProseMirror content with rewritten emoji references.
 */
export function rewriteEmojiReferences(
  content: ProsemirrorData,
  emojiIdMap: Record<string, string>
): ProsemirrorData {
  if (!Object.keys(emojiIdMap).length) {
    return content;
  }

  const transform = (node: ProsemirrorData): ProsemirrorData => {
    const name = node.type === "emoji" ? node.attrs?.["data-name"] : undefined;
    const rewritten = typeof name === "string" ? emojiIdMap[name] : undefined;

    return {
      ...node,
      ...(rewritten
        ? { attrs: { ...node.attrs, "data-name": rewritten } }
        : undefined),
      ...(node.content ? { content: node.content.map(transform) } : undefined),
    };
  };

  return transform(content);
}

/**
 * Maps a document or collection icon onto the emoji id the import resolved it
 * to, when the icon is a custom emoji. Other icon types pass through.
 *
 * @param icon The icon as it appears in the export.
 * @param emojiIdMap Map of external emoji id → new internal id.
 * @returns The icon to store on the imported model.
 */
function rewriteEmojiIcon(
  icon: string | null | undefined,
  emojiIdMap: Record<string, string>
): string | null | undefined {
  return icon && isUUID(icon) ? (emojiIdMap[icon] ?? icon) : icon;
}

export default class JSONAPIImportTask extends APIImportTask<Service> {
  protected shouldUploadAttachmentsPerPage(): boolean {
    return false;
  }

  protected async scheduleNextTask(importTask: ImportTask<Service>) {
    await new JSONAPIImportTask().schedule({ importTaskId: importTask.id });
  }

  protected async onAllTasksCompleted(
    lastImportTask: ImportTask<Service>
  ): Promise<void> {
    const scratch = lastImportTask.import.scratch;
    if (!scratch?.storageKey || !scratch.manifest?.length) {
      return;
    }

    const { teamId, createdById } = lastImportTask.import;

    const handle = await FileStorage.getFileHandle(scratch.storageKey);

    try {
      const createdBy = lastImportTask.import.createdBy;
      const manifestByPath = new Map<string, JSONAttachmentManifestItem>(
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
        const normalized = entry.fileName
          .split("/")
          .filter((s) => s !== "" && s !== ".")
          .join("/");
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
            `JSON import attachment missing in zip, skipping: ${item.pathInZip}`
          );
        }
      }

      // Emojis point at the attachments created above, so they can only be
      // created once the walk is complete.
      if (scratch.emojis?.length) {
        await this.createEmojis(scratch.emojis, teamId, createdById);
      }
    } finally {
      await handle.cleanup().catch(() => {});
    }
  }

  protected async processBootstrap(
    importTask: ImportTask<Service>
  ): Promise<ProcessOutput<Service>> {
    const storageKey = importTask.import.scratch?.storageKey;
    if (!storageKey) {
      throw new Error("JSON import is missing scratch.storageKey");
    }

    const handle = await FileStorage.getFileHandle(storageKey);

    try {
      // Pre-load every JSON file at the top level of the zip during the walk.
      // ZipHelper streams the archive end-to-end; capturing here means we can
      // pair tree nodes with their parsed content without re-opening the zip.
      const jsonByPath = new Map<string, unknown>();
      const maxJSONSize = AttachmentHelper.presetToMaxUploadSize(
        AttachmentPreset.WorkspaceImport
      );

      const tree = await ZipHelper.toFileTree(
        handle.path,
        async (node, entry) => {
          if (path.extname(node.name).toLowerCase() !== ".json") {
            return;
          }
          const buffer = await entry.readBuffer(maxJSONSize);
          try {
            jsonByPath.set(node.pathInZip, JSON.parse(buffer.toString("utf8")));
          } catch (err) {
            throw new Error(
              `Could not parse ${node.name}. ${err instanceof Error ? err.message : "unknown error"}`
            );
          }
        }
      );

      if (tree.children.length === 0) {
        throw new Error("Could not find valid content in zip file");
      }

      const metadata = jsonByPath.get("metadata.json") as
        | JSONExportMetadata
        | undefined;
      Logger.debug("task", "Importing JSON metadata", { metadata });

      const manifest: JSONAttachmentManifestItem[] = [];
      // External attachment id → manifest entry id (the new Attachment.id).
      const attachmentIdMap: Record<string, string> = {};

      const collectionExports: {
        externalId: string;
        data: CollectionJSONExport;
      }[] = [];

      for (const node of tree.children) {
        if (node.children.length > 0 || node.name === "metadata.json") {
          continue;
        }
        if (path.extname(node.name).toLowerCase() !== ".json") {
          Logger.debug("task", `Unhandled file in zip: ${node.pathInZip}`, {
            importTaskId: importTask.id,
          });
          continue;
        }

        const parsed = jsonByPath.get(node.pathInZip) as
          | CollectionJSONExport
          | undefined;
        if (!parsed) {
          continue;
        }

        const collectionExternalId = parsed.collection.id;

        collectionExports.push({
          externalId: collectionExternalId,
          data: parsed,
        });

        for (const attachment of Object.values(parsed.attachments ?? {})) {
          this.registerAttachment(attachment, manifest, attachmentIdMap);
        }
      }

      // Custom emojis are resolved against the destination team before any
      // content is rewritten, so documents can reference them by their final
      // id even though the Emoji rows are only created once their attachments
      // have landed in the completion phase.
      const emojiManifest: JSONEmojiManifestItem[] = [];
      const emojiIdMap: Record<string, string> = {};
      await this.registerEmojis(
        collectionExports.map((c) => c.data),
        importTask.import.teamId,
        attachmentIdMap,
        emojiManifest,
        emojiIdMap
      );

      // Discover documents per collection, building the parent/child tree
      // shape expected by the per-page cascade.
      const collections = collectionExports.map((c) =>
        this.buildCollection(c.externalId, c.data)
      );

      // Replace anything past the create-time placeholder with the freshly
      // discovered collections so a retried bootstrap doesn't accumulate
      // duplicate entries.
      const associatedImport = importTask.import;
      const placeholder = associatedImport.input[0];
      associatedImport.input = [
        placeholder,
        ...collections.map((c) => ({
          externalId: c.externalId,
          permission: placeholder.permission,
        })),
      ];
      associatedImport.scratch = {
        storageKey,
        manifest,
        emojis: emojiManifest,
      };
      await associatedImport.save();

      // Collection placeholder items so ImportsProcessor iterates them
      // during the bootstrap row (the earliest createdAt) — that guarantees
      // collections land in the DB before any per-page document references
      // them.
      importTask.input = [
        importTask.input[0],
        ...collections.map<JSONPageImportTaskInputItem>((c) => ({
          externalId: c.externalId,
          title: c.export.name,
          urlId: c.export.urlId,
          icon: c.export.icon,
          color: c.export.color,
          data: c.export.data ?? ProsemirrorDataHelper.getEmpty(),
          attachmentIdMap,
          emojiIdMap,
        })),
      ];

      const collectionOutputs: ImportTaskOutput = collections.map((c) => ({
        externalId: c.externalId,
        title: c.export.name,
        urlId: c.export.urlId,
        icon: rewriteEmojiIcon(c.export.icon, emojiIdMap),
        color: c.export.color,
        content: rewriteEmojiReferences(
          rewriteAttachmentReferences(
            c.export.data ?? ProsemirrorDataHelper.getEmpty(),
            attachmentIdMap
          ),
          emojiIdMap
        ) as ProsemirrorDoc,
      }));

      // First wave of document tasks: only top-level docs in each collection.
      // Each carries its descendants in `children` and the per-page handler
      // re-emits them as the next wave of childTasksInput, producing a strict
      // depth-ordered cascade of ImportTask rows so parent FKs are always
      // satisfied at child-doc creation time.
      const childTasksInput: ImportTaskInput<Service> = collections.flatMap(
        (c) =>
          c.children.map((d) =>
            this.toPageInput(d, attachmentIdMap, emojiIdMap)
          )
      );

      return { taskOutput: collectionOutputs, childTasksInput };
    } finally {
      await handle.cleanup().catch(() => {});
    }
  }

  protected async processPage(
    importTask: ImportTask<Service>
  ): Promise<ProcessOutput<Service>> {
    const taskOutput: ImportTaskOutput = [];
    const childTasksInput: JSONPageImportTaskInputItem[] = [];

    const items = importTask.input as JSONPageImportTaskInputItem[];
    for (const item of items) {
      const emojiIdMap = item.emojiIdMap ?? {};
      const transformed = rewriteEmojiReferences(
        rewriteAttachmentReferences(item.data, item.attachmentIdMap),
        emojiIdMap
      ) as ProsemirrorDoc;

      taskOutput.push({
        externalId: item.externalId,
        title: item.title,
        urlId: item.urlId,
        icon: rewriteEmojiIcon(item.icon, emojiIdMap),
        color: item.color,
        author: item.createdByName,
        createdById: item.createdById,
        createdByEmail: item.createdByEmail,
        createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        content: transformed,
      });

      if (item.children?.length) {
        childTasksInput.push(...item.children);
      }
    }

    return { taskOutput, childTasksInput };
  }

  /**
   * Discovers documents in a parsed CollectionJSONExport, recursively packing
   * each parent's direct descendants into `children`. Falls back to the
   * export's `documentStructure` when present (preserves authored order) and
   * otherwise walks the `documents` map.
   *
   * @param externalId The collection's external id.
   * @param data Parsed CollectionJSONExport.
   * @returns A collection record with a tree of `DiscoveredDocument`s.
   */
  private buildCollection(
    externalId: string,
    data: CollectionJSONExport
  ): {
    externalId: string;
    export: CollectionJSONExport["collection"];
    children: DiscoveredDocument[];
  } {
    const docMap: Record<string, DocumentJSONExport> = data.documents ?? {};

    const makeNode = (
      doc: DocumentJSONExport,
      parentExternalId?: string
    ): DiscoveredDocument => ({
      externalId: doc.id,
      parentExternalId: parentExternalId ?? doc.parentDocumentId ?? undefined,
      collectionExternalId: externalId,
      export: doc,
      children: [],
    });

    // Prefer the authored `documentStructure` if available — it preserves
    // sibling order; otherwise fall back to parent/child links.
    const roots: DiscoveredDocument[] = [];

    if (data.collection.documentStructure?.length) {
      const walk = (
        navNodes: { id: string; children?: typeof navNodes }[],
        parentExternalId: string | undefined,
        out: DiscoveredDocument[]
      ) => {
        for (const nav of navNodes) {
          const doc = docMap[nav.id];
          if (!doc) {
            continue;
          }
          const node = makeNode(doc, parentExternalId);
          out.push(node);
          if (nav.children?.length) {
            walk(nav.children, doc.id, node.children);
          }
        }
      };
      walk(data.collection.documentStructure, undefined, roots);
    } else {
      const byParent = new Map<string | undefined, DocumentJSONExport[]>();
      for (const doc of Object.values(docMap)) {
        const parent = doc.parentDocumentId ?? undefined;
        const bucket = byParent.get(parent) ?? [];
        bucket.push(doc);
        byParent.set(parent, bucket);
      }

      const walk = (
        parentExternalId: string | undefined,
        out: DiscoveredDocument[]
      ) => {
        const docs = byParent.get(parentExternalId) ?? [];
        for (const doc of docs) {
          const node = makeNode(doc, parentExternalId);
          out.push(node);
          walk(doc.id, node.children);
        }
      };
      walk(undefined, roots);
    }

    return {
      externalId,
      export: data.collection,
      children: roots,
    };
  }

  /**
   * Records an attachment in the manifest and the external→new id map. Skips
   * duplicates so collections that share an attachment id (unlikely in a
   * valid export, but possible) only land once.
   *
   * @param attachment The attachment as it appears in the export.
   * @param manifest Manifest array to push entries into.
   * @param attachmentIdMap External id → new internal id map.
   */
  private registerAttachment(
    attachment: AttachmentJSONExport,
    manifest: JSONAttachmentManifestItem[],
    attachmentIdMap: Record<string, string>
  ): void {
    if (attachmentIdMap[attachment.id]) {
      return;
    }
    if (attachment.key.includes("..")) {
      throw new Error(`Invalid attachment path: ${attachment.key}`);
    }
    const id = randomUUID();
    attachmentIdMap[attachment.id] = id;
    manifest.push({
      id,
      externalId: attachment.id,
      name: attachment.name,
      mimeType: attachment.contentType || "application/octet-stream",
      pathInZip: attachment.key,
    });
  }

  /**
   * Converts a discovered document subtree into a per-page task input,
   * recursively packing the doc's descendants into the `children` field so
   * each tree-depth runs as its own task wave.
   *
   * @param doc The discovered document, including its descendants.
   * @param attachmentIdMap External attachment id → new internal id map.
   * @param emojiIdMap External custom emoji id → new internal id map.
   * @returns A self-contained per-page task input.
   */
  private toPageInput(
    doc: DiscoveredDocument,
    attachmentIdMap: Record<string, string>,
    emojiIdMap: Record<string, string>
  ): JSONPageImportTaskInputItem {
    const exported = doc.export;
    return {
      externalId: doc.externalId,
      parentExternalId: doc.parentExternalId,
      collectionExternalId: doc.collectionExternalId,
      title: exported.title,
      urlId: exported.urlId,
      icon: exported.icon ?? exported.emoji,
      color: exported.color,
      data: exported.data,
      createdById: exported.createdById,
      createdByName: exported.createdByName,
      createdByEmail: exported.createdByEmail,
      createdAt: exported.createdAt,
      updatedAt: exported.updatedAt,
      publishedAt: exported.publishedAt,
      attachmentIdMap,
      emojiIdMap,
      children: doc.children.length
        ? doc.children.map((c) =>
            this.toPageInput(c, attachmentIdMap, emojiIdMap)
          )
        : undefined,
    };
  }

  /**
   * Resolves the custom emojis referenced by an export against the destination
   * team. An emoji whose name already exists in the team is reused, otherwise
   * an id is pre-assigned so content can be rewritten now and the Emoji row
   * created once its attachment exists. Emojis whose image is missing from the
   * export are skipped, leaving their references untouched.
   *
   * @param collections Parsed collection exports to read emojis from.
   * @param teamId Team the import is landing in.
   * @param attachmentIdMap External attachment id → new internal id map.
   * @param manifest Manifest array to push to-be-created emojis into.
   * @param emojiIdMap External emoji id → resolved id map to populate.
   */
  private async registerEmojis(
    collections: CollectionJSONExport[],
    teamId: string,
    attachmentIdMap: Record<string, string>,
    manifest: JSONEmojiManifestItem[],
    emojiIdMap: Record<string, string>
  ): Promise<void> {
    const exported = new Map<string, EmojiJSONExport>();
    for (const collection of collections) {
      for (const emoji of Object.values(collection.emojis ?? {})) {
        exported.set(emoji.id, emoji);
      }
    }

    if (!exported.size) {
      return;
    }

    const existing = await Emoji.findAll({
      where: {
        teamId,
        name: [...exported.values()].map((emoji) => emoji.name),
      },
    });
    const existingByName = new Map(existing.map((e) => [e.name, e.id]));

    for (const emoji of exported.values()) {
      const existingId = existingByName.get(emoji.name);
      if (existingId) {
        emojiIdMap[emoji.id] = existingId;
        continue;
      }

      const attachmentId = attachmentIdMap[emoji.attachmentId];
      if (!attachmentId) {
        Logger.warn(
          `JSON import emoji image missing in export, skipping: ${emoji.name}`
        );
        continue;
      }

      const id = randomUUID();
      emojiIdMap[emoji.id] = id;
      manifest.push({ id, name: emoji.name, attachmentId });
    }
  }

  /**
   * Creates the Emoji rows pre-assigned during bootstrap. Called once every
   * attachment has landed, since an emoji is a pointer to its image. Failures
   * are logged rather than thrown — a single unusable emoji shouldn't fail an
   * otherwise complete import.
   *
   * @param emojis Emoji manifest recorded on the import's scratch state.
   * @param teamId Team the import is landing in.
   * @param createdById User that initiated the import.
   */
  private async createEmojis(
    emojis: JSONEmojiManifestItem[],
    teamId: string,
    createdById: string
  ): Promise<void> {
    for (const emoji of emojis) {
      try {
        // A retried completion hook re-encounters emojis it already created,
        // and a name may have been taken since bootstrap resolved it.
        const existing = await Emoji.findOne({
          where: {
            teamId,
            [Op.or]: [{ id: emoji.id }, { name: emoji.name }],
          },
        });
        if (existing) {
          continue;
        }

        await Emoji.create({
          id: emoji.id,
          name: emoji.name,
          attachmentId: emoji.attachmentId,
          teamId,
          createdById,
        });
      } catch (err) {
        if (err instanceof UniqueConstraintError) {
          continue;
        }
        Logger.warn(`JSON import could not create emoji: ${emoji.name}`, {
          error: errToString(err),
        });
      }
    }
  }
}
