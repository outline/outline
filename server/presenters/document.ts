import { Hour } from "@shared/utils/time";
import { traceFunction } from "@server/logging/tracing";
import { Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { APIContext } from "@server/types";
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
      ? DocumentHelper.toMarkdown(data, { includeTitle: false })
      : undefined;

  const res: Record<string, any> = {
    id: document.id,
    url: document.path,
    urlId: document.urlId,
    title: document.title,
    data: asData || options?.includeData ? data : undefined,
    text,
    icon: document.icon,
    color: document.color,
    tasks: document.tasks,
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
  };

  if (!!document.views && document.views.length > 0) {
    res.lastViewedAt = document.views[0].updatedAt;
  }

  if (!options.isPublic) {
    const source = await document.$get("import");

    res.isCollectionDeleted = await document.isCollectionDeleted();
    res.collectionId = document.collectionId;
    res.parentDocumentId = document.parentDocumentId;
    res.createdBy = presentUser(document.createdBy);
    res.updatedBy = presentUser(document.updatedBy);
    res.collaboratorIds = document.collaboratorIds;
    res.templateId = document.templateId;
    res.template = document.template;
    res.insightsEnabled = document.insightsEnabled;
    res.sourceMetadata = document.sourceMetadata
      ? {
          importedAt: source?.createdAt ?? document.createdAt,
          importType: source?.format,
          createdByName: document.sourceMetadata.createdByName,
          fileName: document.sourceMetadata?.fileName,
        }
      : undefined;
  }

  return res;
}

export default traceFunction({
  spanName: "presenters",
})(presentDocument);
