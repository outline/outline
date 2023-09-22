import { CollectionPermission } from "@shared/types";
import { GroupPermission } from "@server/models";

type Membership = {
  id: string;
  groupId: string;
  collectionId?: string | null;
  permission: CollectionPermission;
};

export default function presentCollectionGroupMembership(
  membership: GroupPermission
): Membership {
  return {
    id: `${membership.groupId}-${membership.collectionId}`,
    groupId: membership.groupId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
}
