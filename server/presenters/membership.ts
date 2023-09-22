import { CollectionPermission } from "@shared/types";
import { UserPermission } from "@server/models";

type Membership = {
  id: string;
  userId: string;
  collectionId?: string | null;
  permission: CollectionPermission;
};

export default function presentMembership(
  membership: UserPermission
): Membership {
  return {
    id: `${membership.userId}-${membership.collectionId}`,
    userId: membership.userId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
}
