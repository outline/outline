// @flow
import invariant from 'invariant';
import policy from './policy';
import { Collection, User } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(User, 'create', Collection);

allow(User, ['read', 'export'], Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) return false;

  if (
    collection.private &&
    (!collection.memberships || !collection.memberships.length)
  ) {
    return false;
  }

  return true;
});

allow(User, ['publish', 'update'], Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) return false;

  if (collection.private) {
    invariant(
      collection.memberships,
      'membership should be preloaded, did you forget withMembership scope?'
    );
    if (!collection.memberships.length) return false;

    return ['read_write', 'maintainer'].includes(
      collection.memberships[0].permission
    );
  }

  return true;
});

allow(User, 'delete', Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) return false;

  if (collection.private) {
    invariant(
      collection.memberships,
      'membership should be preloaded, did you forget withMembership scope?'
    );
    if (!collection.memberships.length) return false;

    if (
      !['read_write', 'maintainer'].includes(
        collection.memberships[0].permission
      )
    ) {
      return false;
    }
  }

  if (user.isAdmin) return true;
  if (user.id === collection.creatorId) return true;

  throw new AdminRequiredError();
});
