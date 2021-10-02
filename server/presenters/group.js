// @flow
import { Group } from "../models";

export default function present(group: Group) {
  return {
    id: group.id,
    name: group.name,
    isPrivate: group.isPrivate,
    memberCount: group.groupMemberships.length,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
