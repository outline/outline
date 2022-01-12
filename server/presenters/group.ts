import Group from "@server/models/Group";

export default function present(group: Group) {
  return {
    id: group.id,
    name: group.name,
    memberCount: group.groupMemberships.length,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
