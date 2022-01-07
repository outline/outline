import { CollectionUser } from "@server/models";

type Membership = {
  id: string;
  userId: string;
  collectionId: string;
  permission: string;
};

export default (membership: CollectionUser): Membership => {
  return {
    id: `${membership.userId}-${membership.collectionId}`,
    userId: membership.userId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
};
