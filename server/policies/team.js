// @flow
import policy from './policy';
import { Team, User } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(User, 'read', Team, (user, team) => team && user.teamId === team.id);

allow(User, ['update', 'export'], Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  if (user.isAdmin) return true;
  throw new AdminRequiredError();
});

/**
 * Team's subscription is visible for all team users
 */
allow(
  User,
  'readPlanSubscription',
  Team,
  (user, team) => user.teamId === team.id
);

/**
 * Team subscription plan is only available for admin users
 */
allow(
  User,
  [
    'createPlanSubscription',
    'cancelPlanSubscription',
    'updatePlanSubscription',
  ],
  Team,
  (actor, team) => {
    if (!actor || actor.teamId !== team.id) return false;
    if (actor.isAdmin) return true;
    throw new AdminRequiredError();
  }
);
