import { Hour } from "@shared/utils/time";
import { traceFunction } from "@server/logging/tracing";
import type { Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import type { APIContext } from "@server/types";
import presentUser from "./user";

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
  /** Array of backlink document IDs to include in the response. */
  backlinkIds?: string[];
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
    data: asData || options?.includeData ? data : undefined,
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
    deletedAt: document.deletedAt,
    collaboratorIds: [],
    revision: document.revisionCount,
    fullWidth: document.fullWidth,
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

  if (!options.isPublic) {
    const source = await document.$get("import");

    res.tasks = document.tasks;
    res.isCollectionDeleted = await document.isCollectionDeleted();
    res.collectionId = document.collectionId;
    res.parentDocumentId = document.parentDocumentId;
    res.createdBy = presentUser(document.createdBy);
    res.updatedBy = presentUser(document.updatedBy);
    res.collaboratorIds = document.collaboratorIds;
    res.templateId = document.templateId;
    res.insightsEnabled = document.insightsEnabled;
    res.popularityScore = document.popularityScore;
    res.sourceMetadata = document.sourceMetadata
      ? {
          importedAt: source?.createdAt ?? document.createdAt,
          importType: source?.format,
          createdByName: document.sourceMetadata.createdByName,
          fileName: document.sourceMetadata?.fileName,
          originalDocumentId: document.sourceMetadata?.originalDocumentId,
        }
      : undefined;
  }

  return res;
}

export default traceFunction({
  spanName: "presenters",
})(presentDocument);
