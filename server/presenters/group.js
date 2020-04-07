// @flow
import { Group } from '../models';

export default function present(group: Group) {
  return {
    id: group.id,
    name: group.name,
    memberCount: group.groupMemberships.length,
    updatedAt: group.updatedAt,
  };
}
