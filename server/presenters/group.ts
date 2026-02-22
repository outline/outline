import type Group from "@server/models/Group";

/**
 * Presents a group for the API response.
 *
 * @param group - the group to present.
 * @returns the presented group object.
 */
export default async function presentGroup(group: Group) {
  const externalGroup = group.externalGroups?.[0];

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    externalId: group.externalId,
    memberCount: await group.memberCount,
    disableMentions: group.disableMentions,
    externalGroup: externalGroup
      ? {
          id: externalGroup.id,
          externalId: externalGroup.externalId,
          providerName: externalGroup.authenticationProvider?.name,
          lastSyncedAt: externalGroup.lastSyncedAt,
        }
      : undefined,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
