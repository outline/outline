import { CollectionPermission, DocumentPermission } from "@shared/types";
import { UserPermission } from "@server/models";

type Membership = {
  id: string;
  userId: string;
  collectionId?: string | null;
  permission: CollectionPermission | DocumentPermission;
};

export default function presentMembership(
  membership: UserPermission
): Membership {
  return {
    id: membership.id,
    userId: membership.userId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
}
