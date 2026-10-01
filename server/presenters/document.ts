import { Op, type Transaction } from "sequelize";
import { Hour } from "@shared/utils/time";
import { traceFunction } from "@server/logging/tracing";
import { DocumentTag, Tag, type Document } from "@server/models";
import FileOperation from "@server/models/FileOperation";
import User from "@server/models/User";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import type { APIContext } from "@server/types";
import { presentDocumentTag } from "./tag";
import presentUser from "./user";

/**
 * Batch-load presented tags for a set of documents, keyed by document id.
 * Used so document responses can include each document's tags with a single
 * extra query, batched by document id, rather than one query per document.
 * Each document's tags are ordered by name.
 *
 * @param documentIds the document ids to load tags for.
 * @param options.transaction the transaction to read within — required to see
 * tags written earlier in the same transaction (e.g. by documentDuplicator)
 * before it commits.
 * @returns map of document id to its presented tags.
 */
export async function loadDocumentTags(
  documentIds: string[],
  options: { transaction?: Transaction } = {}
): Promise<Map<string, ReturnType<typeof presentDocumentTag>[]>> {
  const tagsByDocumentId = new Map<
    string,
    ReturnType<typeof presentDocumentTag>[]
  >();
  if (documentIds.length === 0) {
    return tagsByDocumentId;
  }

  const documentTags = await DocumentTag.findAll({
    where: { documentId: { [Op.in]: documentIds } },
    include: [{ model: Tag }],
    transaction: options.transaction,
  });

  for (const documentTag of documentTags) {
    const tags = tagsByDocumentId.get(documentTag.documentId) ?? [];
    tags.push(presentDocumentTag(documentTag.tag));
    tagsByDocumentId.set(documentTag.documentId, tags);
  }

  for (const tags of tagsByDocumentId.values()) {
    tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  return tagsByDocumentId;
}

type Options = {
  /** Whether to render the document's public fields. */
  isPublic?: boolean;
  /** The root share ID when presenting a shared document. */
  shareId?: string;
  /** Always include the text of the document in the payload. */
  includeText?: boolean;
  /** Always include the data of the document in the payload. */
  includeData?: boolean;
  /** Include the updatedAt timestamp for public documents. */
  includeUpdatedAt?: boolean;
  /** Include the unresolved comment count. Each call triggers a Redis lookup
   * so only enable when the consumer needs the signal (e.g. MCP). */
  includeCommentCount?: boolean;
  /** Array of backlink document IDs to include in the response. */
  backlinkIds?: string[];
  /**
   * Include the document's tags, defaults to true. Disabled for websocket and
   * webhook payloads, whose consumers follow the tags.* events instead.
   */
  includeTags?: boolean;
  /**
   * Pre-resolved presented tags for this document, set by `presentDocuments`
   * (and the `documents.search` route) to batch-load tags for many documents
   * in a single query. When omitted, `presentDocument` loads the document's
   * own tags itself, in a single-document batch.
   */
  tags?: ReturnType<typeof presentDocumentTag>[];
};

async function presentDocument(
  ctx: APIContext | undefined,
  document: Document,
  options: Options | null | undefined = {}
) {
  options = {
    isPublic: false,
    ...options,
  };

  const asData = !ctx || Number(ctx?.headers["x-api-version"] ?? 0) >= 3;

  const data = await DocumentHelper.toJSON(
    document,
    options.isPublic
      ? {
          signedUrls: Hour.seconds,
          teamId: document.teamId,
          removeMarks: ["comment"],
          internalUrlBase: `/s/${options.shareId}`,
        }
      : undefined
  );

  const text =
    !asData || options?.includeText
      ? await DocumentHelper.toMarkdown(data, { includeTitle: false })
      : undefined;

  const res: Record<string, unknown> = {
    id: document.id,
    url: document.path,
    urlId: document.urlId,
    title: document.title,
    data:
      options?.includeData === false
        ? undefined
        : asData || options?.includeData
          ? data
          : undefined,
    text,
    icon: document.icon,
    color: document.color,
    tasks: {
      completed: 0,
      total: 0,
    },
    language: document.language,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    publishedAt: document.publishedAt,
    archivedAt: document.archivedAt,
    deprecatedReason: document.deprecatedReason,
    deletedAt: document.deletedAt,
    deletedBy: undefined,
    collaboratorIds: [],
    revision: document.revisionCount,
    fullWidth: document.fullWidth,
    preferences: document.preferences,
    collectionId: undefined,
    parentDocumentId: undefined,
    lastViewedAt: undefined,
    isCollectionDeleted: undefined,
    backlinkIds: options?.backlinkIds,
  };

  if (!!document.views && document.views.length > 0) {
    res.lastViewedAt = document.views[0].updatedAt;
  }

  if (options.isPublic && !options.includeUpdatedAt) {
    delete res.updatedAt;
  }

  if (document.summary) {
    res.summary = document.summary;
  }

  if (!options.isPublic) {
    res.tasks = document.tasks;
    res.isCollectionDeleted = await document.isCollectionDeleted();
    res.collectionId = document.collectionId;
    res.parentDocumentId = document.parentDocumentId;
    res.createdBy = presentUser(document.createdBy);
    res.updatedBy = presentUser(document.updatedBy);
    res.collaboratorIds = document.collaboratorIds ?? [];
    res.templateId = document.templateId;
    res.insightsEnabled = document.insightsEnabled;
    res.popularityScore = document.popularityScore;
    // Share-link responses never include tags — upstream exposes no
    // comparable per-document metadata there, so keep them out too.
    if (!options.shareId && options.includeTags !== false) {
      res.tags =
        options.tags ??
        (
          await loadDocumentTags([document.id], {
            transaction: ctx?.state.transaction,
          })
        ).get(document.id) ??
        [];
    }
    if (document.deletedById) {
      const deletedBy =
        document.deletedBy ??
        (await document.$get("deletedBy", { paranoid: false }));
      if (deletedBy) {
        res.deletedBy = presentUser(deletedBy);
      }
    }
    if (options.includeCommentCount) {
      res.commentCount = await document.commentCount;
    }
    if (document.sourceMetadata) {
      const source = document.import ?? (await document.$get("import"));
      res.sourceMetadata = {
        importedAt: source?.createdAt ?? document.createdAt,
        importType: source?.format,
        createdByName: document.sourceMetadata.createdByName,
        fileName: document.sourceMetadata?.fileName,
        originalDocumentId: document.sourceMetadata?.originalDocumentId,
      };
    }
  }

  return res;
}

export default traceFunction({
  spanName: "presenters",
})(presentDocument);

/**
 * Batch-present multiple documents, fetching all related FileOperation and
 * deleting User records in a single query instead of one per document.
 *
 * @param ctx the API context.
 * @param documents the documents to present.
 * @param options presentation options forwarded to presentDocument.
 * @returns array of presented document objects.
 */
export async function presentDocuments(
  ctx: APIContext | undefined,
  documents: Document[],
  options?: Options | null
) {
  const opts = { isPublic: false, ...options };

  const tagsByDocumentId =
    !opts.isPublic && !opts.shareId && opts.includeTags !== false
      ? await loadDocumentTags(
          documents.map((doc) => doc.id),
          { transaction: ctx?.state.transaction }
        )
      : new Map<string, ReturnType<typeof presentDocumentTag>[]>();

  if (!opts.isPublic) {
    const importIds = documents
      .filter((doc) => doc.sourceMetadata && doc.importId)
      .map((doc) => doc.importId!);

    if (importIds.length > 0) {
      const sources = await FileOperation.unscoped().findAll({
        where: { id: { [Op.in]: importIds } },
      });
      const sourceMap = new Map(sources.map((s) => [s.id, s]));

      for (const doc of documents) {
        if (doc.importId) {
          doc.import = sourceMap.get(doc.importId) ?? null;
        }
      }
    }

    // Deduplicated because a page of trashed documents is often the work of a
    // single person, and only for documents that arrived without the
    // association so that an eager loaded one is not overwritten.
    const deletedByIds = new Set(
      documents
        .filter((doc) => doc.deletedById && !doc.deletedBy)
        .map((doc) => doc.deletedById!)
    );

    if (deletedByIds.size > 0) {
      const users = await User.unscoped().findAll({
        where: { id: { [Op.in]: Array.from(deletedByIds) } },
        paranoid: false,
      });
      const userMap = new Map(users.map((user) => [user.id, user]));

      for (const doc of documents) {
        if (doc.deletedById && !doc.deletedBy) {
          doc.deletedBy = userMap.get(doc.deletedById) ?? null;
        }
      }
    }
  }

  return Promise.all(
    documents.map((document) =>
      presentDocument(ctx, document, {
        ...opts,
        tags: tagsByDocumentId.get(document.id) ?? [],
      })
    )
  );
}
