import { traceFunction } from "@server/logging/tracing";
import { Document } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
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
    ? await DocumentHelper.attachmentsToSignedUrls(
        document.text,
        document.teamId
      )
    : document.text;

  const data: Record<string, any> = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
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
    template: document.template,
    templateId: document.templateId,
    collaboratorIds: [],
    revision: document.revisionCount,
    insightsEnabled: document.insightsEnabled,
    fullWidth: document.fullWidth,
    collectionId: undefined,
    parentDocumentId: undefined,
    lastViewedAt: undefined,
  };

  if (!!document.views && document.views.length > 0) {
    data.lastViewedAt = document.views[0].updatedAt;
  }

  if (!options.isPublic) {
    data.collectionId = document.collectionId;
    data.parentDocumentId = document.parentDocumentId;
    data.createdBy = presentUser(document.createdBy);
    data.updatedBy = presentUser(document.updatedBy);
    data.collaboratorIds = document.collaboratorIds;
  }

  return data;
}

export default traceFunction({
  spanName: "presenters",
})(presentDocument);
