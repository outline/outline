// @flow
import { CollectionGroup } from "../models";

type Membership = {
  id: string,
  groupId: string,
  collectionId: string,
  permission: string,
};

export default (membership: CollectionGroup): Membership => {
  return {
    id: `${membership.groupId}-${membership.collectionId}`,
    groupId: membership.groupId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
};
