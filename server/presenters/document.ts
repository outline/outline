import { traceFunction } from "@server/logging/tracing";
import { Document } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
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

  const asJSON = !ctx || Number(ctx?.headers["x-api-version"] ?? 0) >= 3;
  const data: Record<string, any> = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    data: asJSON
      ? await DocumentHelper.toJSON(
          document,
          options.isPublic
            ? { signedUrls: 60, teamId: document.teamId }
            : undefined
        )
      : undefined,
    text: asJSON ? document.text : undefined,
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
    data.templateId = document.templateId;
    data.template = document.template;
    data.insightsEnabled = document.insightsEnabled;
  }

  return data;
}

export default traceFunction({
  spanName: "presenters",
})(presentDocument);
