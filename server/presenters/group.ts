import Group from "@server/models/Group";

export default async function presentGroup(group: Group) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    externalId: group.externalId,
    memberCount: await group.memberCount,
    disableMentions: group.disableMentions,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
