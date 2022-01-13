import GroupUser from "@server/models/GroupUser";
import { presentUser } from ".";

type GroupMembership = {
  id: string;
  userId: string;
  groupId: string;
  user: ReturnType<typeof presentUser>;
};

export default (membership: GroupUser): GroupMembership => {
  return {
    id: `${membership.userId}-${membership.groupId}`,
    userId: membership.userId,
    groupId: membership.groupId,
    user: presentUser(membership.user),
  };
};
