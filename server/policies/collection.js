// @flow
import policy from './policy';
import { Collection, User } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(User, 'create', Collection);

allow(
  User,
  ['read', 'publish', 'update'],
  Collection,
  (user, collection) => collection && user.teamId === collection.teamId
);

allow(User, 'delete', Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) return false;
  if (user.id === collection.creatorId) return true;
  if (!user.isAdmin) throw new AdminRequiredError();
});
