// @flow
import policy from './policy';
import { Collection, User } from '../models';

const { allow } = policy;

allow(User, 'create', Collection);

allow(
  User,
  ['read', 'publish', 'update'],
  Collection,
  (user, collection) => collection && user.teamId === collection.teamId
);

allow(
  User,
  'delete',
  Collection,
  (user, collection) =>
    collection &&
    user.teamId === collection.teamId &&
    (user.id === collection.creatorId || user.isAdmin)
);
