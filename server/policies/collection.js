// @flow
import policy from './policy';
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
      collection.users &&
      collection.users.length &&
      !collection.users.includes(user)
    )
      return false;
    return true;
  }
);

allow(User, 'delete', Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) return false;
  if (user.isAdmin) return true;

  if (
    collection.users &&
    collection.users.length &&
    !collection.users.includes(user)
  )
    return false;
  if (user.id === collection.creatorId) return true;

  throw new AdminRequiredError();
});
