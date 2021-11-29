import { GroupUser } from "@server/models";
import { presentUser } from ".";

type GroupMembership = {
  id: string;
  userId: string;
  groupId: string;
};

// @ts-expect-error ts-migrate(2749) FIXME: 'GroupUser' refers to a value, but is being used a... Remove this comment to see the full error message
export default (membership: GroupUser): GroupMembership => {
  return {
    id: `${membership.userId}-${membership.groupId}`,
    userId: membership.userId,
    groupId: membership.groupId,
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ id: string; userId: any; groupId: any; use... Remove this comment to see the full error message
    user: presentUser(membership.user),
  };
};
