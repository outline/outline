import { CollectionPermission } from "@shared/types";
import { GroupMembership } from "@server/models";

type Membership = {
  id: string;
  groupId: string;
  collectionId?: string | null;
  permission: CollectionPermission;
};

export default function presentCollectionGroupMembership(
  membership: GroupMembership
): Membership {
  return {
    id: membership.id,
    groupId: membership.groupId,
    collectionId: membership.collectionId,
    permission: membership.permission as CollectionPermission,
  };
}
