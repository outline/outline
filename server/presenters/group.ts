import Group from "@server/models/Group";

export default async function presentGroup(group: Group) {
  return {
    id: group.id,
    name: group.name,
    externalId: group.externalId,
    memberCount: await group.memberCount,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
