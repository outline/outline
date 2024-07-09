import { CollectionPermission, DocumentPermission } from "@shared/types";
import { GroupMembership } from "@server/models";

type Membership = {
  id: string;
  groupId: string;
  collectionId?: string | null;
  permission: CollectionPermission | DocumentPermission;
};

export default function presentCollectionGroupMembership(
  membership: GroupMembership
): Membership {
  return {
    id: membership.id,
    groupId: membership.groupId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
}
