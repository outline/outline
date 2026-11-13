import parseTitle from "@shared/utils/parseTitle";
import { traceFunction } from "@server/logging/tracing";
import type { Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import presentUser from "./user";

type PresentRevisionOptions = {
  /**
   * Whether to include the document content. Defaults to true.
   */
  includeContent?: boolean;
};

async function presentRevision(
  revision: Revision,
  options: PresentRevisionOptions = {}
) {
  const { includeContent = true } = options;

  // Older revisions may store the emoji icon as a prefix of the title.
  const { emoji, strippedTitle } = parseTitle(revision.title);

  const [data, text, collaborators] = await Promise.all([
    includeContent ? DocumentHelper.toJSON(revision) : undefined,
    includeContent ? DocumentHelper.toMarkdown(revision) : undefined,
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
    sourceMetadata: revision.sourceMetadata
      ? {
          authType: revision.sourceMetadata.authType,
        }
      : undefined,
    createdAt: revision.createdAt,
    createdBy: presentUser(revision.user),
    createdById: revision.userId,
    deletedAt: revision.deletedAt,
  };
}

export default traceFunction({
  spanName: "presenters",
})(presentRevision);
