import { traceFunction } from "@server/logging/tracing";
import { Document } from "@server/models";
import TextHelper from "@server/models/helpers/TextHelper";
import presentUser from "./user";

type Options = {
  isPublic?: boolean;
};

async function presentDocument(
  document: Document,
  options: Options | null | undefined = {}
) {
  options = {
    isPublic: false,
    ...options,
  };
  const text = options.isPublic
    ? await TextHelper.attachmentsToSignedUrls(document.text, document.teamId)
    : document.text;

  const data: Record<string, any> = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    emoji: document.emoji,
    text,
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
    isCollectionDeleted: await document.isCollectionDeleted(),
  };

  if (!!document.views && document.views.length > 0) {
    data.lastViewedAt = document.views[0].updatedAt;
  }

  if (!options.isPublic) {
    const source = await document.$get("import");

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
