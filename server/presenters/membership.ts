import { CollectionUser } from "@server/models";
import { CollectionPermission } from "@server/types";

type Membership = {
  id: string;
  userId: string;
  collectionId: string;
  permission: CollectionPermission;
};

export default (membership: CollectionUser): Membership => {
  return {
    id: `${membership.userId}-${membership.collectionId}`,
    userId: membership.userId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
};
