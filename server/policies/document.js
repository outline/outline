// @flow
import policy from './policy';
import { Document, User } from '../models';
import { TeamSuspendedError } from '../errors';

const { allow } = policy;

allow(User, 'create', Document, (user, document) => {
  if (user.teamId !== document.teamId) return false;
  if (!user.team.suspended) return true;
  throw new TeamSuspendedError();
});

allow(
  User,
  ['read', 'update', 'delete', 'share'],
  Document,
  (user, document) => user.teamId === document.teamId
);
