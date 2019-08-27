// @flow
import { CollectionUser } from '../models';

type Membership = {
  permission: string,
};

export default (membership: CollectionUser): Membership => {
  return {
    userId: membership.userId,
    collectionId: membership.collectionId,
    permission: membership.permission,
  };
};
