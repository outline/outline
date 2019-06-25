// @flow
import policy from './policy';
import { User } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(
  User,
  'read',
  User,
  (actor, user) => user && user.teamId === actor.teamId
);

allow(User, 'invite', User, actor => {
  return true;
});

allow(User, ['update', 'delete'], User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) return false;
  if (user.id === actor.id) return true;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});

allow(
  User,
  ['promote', 'demote', 'activate', 'suspend'],
  User,
  (actor, user) => {
    if (!user || user.teamId !== actor.teamId) return false;
    if (actor.isAdmin) return true;
    throw new AdminRequiredError();
  }
);
