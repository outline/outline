import { Group } from "../models";

// @ts-expect-error ts-migrate(2749) FIXME: 'Group' refers to a value, but is being used as a ... Remove this comment to see the full error message
export default function present(group: Group) {
  return {
    id: group.id,
    name: group.name,
    memberCount: group.groupMemberships.length,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
