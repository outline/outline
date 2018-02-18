// @flow
import policy from './policy';
import User from '../models/User';

const { allow } = policy;

allow(
  User,
  'read',
  User,
  (actor, user) => user && user.teamId === actor.teamId
);

allow(
  User,
  ['update', 'delete'],
  User,
  (actor, user) =>
    user &&
    user.teamId === actor.teamId &&
    (user.id === actor.id || actor.isAdmin)
);

allow(
  User,
  ['promote', 'demote'],
  User,
  (actor, user) => user && user.teamId === actor.teamId && actor.isAdmin
);
