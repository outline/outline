import { CollectionGroup } from "@server/models";

type Membership = {
  id: string;
  groupId: string;
  collectionId: string;
  permission: string;
};

// @ts-expect-error ts-migrate(2749) FIXME: 'CollectionGroup' refers to a value, but is being ... Remove this comment to see the full error message
export default (membership: CollectionGroup): Membership => {
  return {
    id: `${membership.groupId}-${membership.collectionId}`,
    groupId: membership.groupId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
};
