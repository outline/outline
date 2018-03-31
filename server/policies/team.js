// @flow
import policy from './policy';
import { User, Team } from '../models';
import { AdminRequiredError, TeamSuspendedError } from '../errors';

const { allow } = policy;

/**
 * Team's subscription is visible for all team users
 */
allow(
  User,
  ['readPlanSubscription'],
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

/**
 * Only teams with active subscription are allowed to create
 * or update documents.
 */
allow(User, ['createContent'], Team, (actor, team) => {
  if (!actor || actor.teamId !== team.id) return false;
  if (!team.suspended) return true;
  throw new TeamSuspendedError();
});
