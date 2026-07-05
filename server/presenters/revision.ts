import parseTitle from "@shared/utils/parseTitle";
import { traceFunction } from "@server/logging/tracing";
import type { Revision, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import presentUser from "./user";

type PresentRevisionOptions = {
  /**
   * Whether to include the document content. Defaults to true.
   */
  includeContent?: boolean;
  /**
   * Preloaded collaborators for the revision. When presenting many revisions
   * pass these to avoid one User query per revision.
   */
  collaborators?: User[];
};

async function presentRevision(
  revision: Revision,
  options: PresentRevisionOptions = {}
) {
  const { includeContent = true } = options;

  // TODO: Remove this fallback once all revisions have been migrated
  const { emoji, strippedTitle } = parseTitle(revision.title);

  const [data, text, collaborators] = await Promise.all([
    includeContent ? DocumentHelper.toJSON(revision) : undefined,
    includeContent ? DocumentHelper.toMarkdown(revision) : undefined,
    options.collaborators ?? revision.collaborators,
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
