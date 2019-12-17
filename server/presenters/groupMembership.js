// @flow
import { GroupUser } from '../models';

type GroupMembership = {
  id: string,
  userId: string,
  groupId: string,
};

export default (membership: GroupUser): GroupMembership => {
  return {
    id: `${membership.userId}-${membership.groupId}`,
    userId: membership.userId,
    groupId: membership.groupId,
  };
};
