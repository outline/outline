import parseTitle from "@shared/utils/parseTitle";
import { traceFunction } from "@server/logging/tracing";
import type { Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import presentUser from "./user";

async function presentRevision(revision: Revision) {
  // TODO: Remove this fallback once all revisions have been migrated
  const { emoji, strippedTitle } = parseTitle(revision.title);

  const [data, text, collaborators] = await Promise.all([
    DocumentHelper.toJSON(revision),
    DocumentHelper.toMarkdown(revision),
    revision.collaborators,
  ]);

  return {
    id: revision.id,
    documentId: revision.documentId,
    title: strippedTitle,
    name: revision.name,
    data,
    text,
    icon: revision.icon ?? emoji,
    color: revision.color,
    collaborators: collaborators.map((user) => presentUser(user)),
    createdAt: revision.createdAt,
    createdBy: presentUser(revision.user),
    createdById: revision.userId,
    deletedAt: revision.deletedAt,
  };
}

export default traceFunction({
  spanName: "presenters",
})(presentRevision);
