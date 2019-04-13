// @flow
import policy from './policy';
import { map } from 'lodash';
import { Collection, User } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(User, 'create', Collection);

allow(
  User,
  ['read', 'publish', 'update', 'export'],
  Collection,
  (user, collection) => {
    if (!collection || user.teamId !== collection.teamId) return false;

    if (
      collection.private &&
      !map(collection.users, u => u.id).includes(user.id)
    ) {
      return false;
    }

    return true;
  }
);

allow(User, 'delete', Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) return false;

  if (
    collection.private &&
    !map(collection.users, u => u.id).includes(user.id)
  ) {
    return false;
  }

  if (user.isAdmin) return true;
  if (user.id === collection.creatorId) return true;

  throw new AdminRequiredError();
});
