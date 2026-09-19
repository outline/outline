import type { TFunction } from "i18next";
import { AuthenticationType } from "@shared/types";
import type Revision from "~/models/Revision";

/** Authentication types that are surfaced in history, mapped to a display name. */
const authTypeNames: Partial<Record<AuthenticationType, string>> = {
  [AuthenticationType.API]: "API",
  [AuthenticationType.OAUTH]: "API",
  [AuthenticationType.MCP]: "MCP",
};

/**
 * Returns a suffix describing how the change was made, for authentication
 * types that are worth surfacing in history.
 *
 * @param authType the authentication type the change was made with.
 * @param t translation function.
 * @returns the suffix, or an empty string if it should not be surfaced.
 */
export function authTypeSuffix(
  authType: AuthenticationType | null | undefined,
  t: TFunction
): string {
  const authTypeName = authType ? authTypeNames[authType] : undefined;
  return authTypeName
    ? ` ${t("via {{ authType }}", { authType: authTypeName })}`
    : "";
}

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
