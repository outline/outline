// @flow
import policy from './policy';
import Collection from '../models/Collection';
import User from '../models/User';

const { allow } = policy;

allow(User, 'create', Collection);

allow(
  User,
  ['read', 'update'],
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
