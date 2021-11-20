import { CollectionUser } from "@server/models";

type Membership = {
  id: string;
  userId: string;
  collectionId: string;
  permission: string;
};

// @ts-expect-error ts-migrate(2749) FIXME: 'CollectionUser' refers to a value, but is being u... Remove this comment to see the full error message
export default (membership: CollectionUser): Membership => {
  return {
    id: `${membership.userId}-${membership.collectionId}`,
    userId: membership.userId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
};
