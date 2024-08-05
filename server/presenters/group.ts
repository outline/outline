import Group from "@server/models/Group";

export default function presentGroup(group: Group) {
  return {
    id: group.id,
    name: group.name,
    memberCount: group.groupUsers.length,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
