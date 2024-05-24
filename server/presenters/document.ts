import { traceFunction } from "@server/logging/tracing";
import { Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";
import { APIContext } from "@server/types";
import presentUser from "./user";

type Options = {
  isPublic?: boolean;
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
  const text =
    options.isPublic && !asData
      ? await TextHelper.attachmentsToSignedUrls(document.text, document.teamId)
      : document.text;

  const data: Record<string, any> = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    data: asData
      ? await DocumentHelper.toJSON(
          document,
          options.isPublic
            ? {
                signedUrls: 60,
                teamId: document.teamId,
                removeMarks: ["comment"],
              }
            : undefined
        )
      : undefined,
    text: asData ? undefined : text,
    emoji: document.emoji,
    tasks: document.tasks,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    publishedAt: document.publishedAt,
    archivedAt: document.archivedAt,
    deletedAt: document.deletedAt,
    teamId: document.teamId,
    collaboratorIds: [],
    revision: document.revisionCount,
    fullWidth: document.fullWidth,
    collectionId: undefined,
    parentDocumentId: undefined,
    lastViewedAt: undefined,
    isCollectionDeleted: undefined,
  };

  if (!!document.views && document.views.length > 0) {
    data.lastViewedAt = document.views[0].updatedAt;
  }

  if (!options.isPublic) {
    const source = await document.$get("import");

    data.isCollectionDeleted = await document.isCollectionDeleted();
    data.collectionId = document.collectionId;
    data.parentDocumentId = document.parentDocumentId;
    data.createdBy = presentUser(document.createdBy);
    data.updatedBy = presentUser(document.updatedBy);
    data.collaboratorIds = document.collaboratorIds;
    data.templateId = document.templateId;
    data.template = document.template;
    data.insightsEnabled = document.insightsEnabled;
    data.sourceMetadata = document.sourceMetadata
      ? {
          importedAt: source?.createdAt ?? document.createdAt,
          importType: source?.format,
          createdByName: document.sourceMetadata.createdByName,
          fileName: document.sourceMetadata?.fileName,
        }
      : undefined;
  }

  return data;
}

export default traceFunction({
  spanName: "presenters",
})(presentDocument);
