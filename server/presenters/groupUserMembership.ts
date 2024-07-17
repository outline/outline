import GroupUser from "@server/models/GroupUser";
import { presentUser } from ".";

type GroupUserMembership = {
  id: string;
  userId: string;
  groupId: string;
  user?: ReturnType<typeof presentUser>;
};

export default function presentGroupUserMembership(
  membership: GroupUser,
  options?: { includeUser: boolean }
): GroupUserMembership {
  return {
    id: `${membership.userId}-${membership.groupId}`,
    userId: membership.userId,
    groupId: membership.groupId,
    user: options?.includeUser ? presentUser(membership.user) : undefined,
  };
}
