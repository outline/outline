import type ExternalGroup from "@server/models/ExternalGroup";

/**
 * Presents an ExternalGroup model for API responses.
 *
 * @param externalGroup - the external group to present.
 * @returns a plain object for serialization.
 */
export default function presentExternalGroup(externalGroup: ExternalGroup) {
  return {
    id: externalGroup.id,
    externalId: externalGroup.externalId,
    name: externalGroup.name,
    groupId: externalGroup.groupId,
    authenticationProviderId: externalGroup.authenticationProviderId,
    lastSyncedAt: externalGroup.lastSyncedAt,
    createdAt: externalGroup.createdAt,
    updatedAt: externalGroup.updatedAt,
  };
}
