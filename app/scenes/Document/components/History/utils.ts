import type { TFunction } from "i18next";
import type Revision from "~/models/Revision";

/**
 * Returns a human-readable summary of who collaborated on a revision. Uses the
 * collaborator list when available, falling back to the creator's name.
 *
 * @param revision the revision to summarize.
 * @param t translation function.
 * @returns the collaborator text, or undefined if unavailable.
 */
export function revisionCollaboratorText(
  revision: Revision,
  t: TFunction
): string | undefined {
  if (revision.collaborators && revision.collaborators.length === 2) {
    return `${revision.collaborators[0].name} and ${revision.collaborators[1].name}`;
  }
  if (revision.collaborators && revision.collaborators.length > 2) {
    return t("{{count}} people", { count: revision.collaborators.length });
  }
  return revision.createdBy?.name;
}
