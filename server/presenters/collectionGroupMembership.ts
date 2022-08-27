import { CollectionPermission } from "@shared/types";
import { CollectionGroup } from "@server/models";

type Membership = {
  id: string;
  groupId: string;
  collectionId: string;
  permission: CollectionPermission;
};

export default (membership: CollectionGroup): Membership => {
  return {
    id: `${membership.groupId}-${membership.collectionId}`,
    groupId: membership.groupId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
};
