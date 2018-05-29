// @flow
import { Share, Team, User } from '../models';
import uuid from 'uuid';

let count = 0;

export async function buildShare(overrides: Object = {}) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }
  if (!overrides.userId) {
    const user = await buildUser({ teamId: overrides.teamId });
    overrides.userId = user.id;
  }

  return Share.create(overrides);
}

export function buildTeam(overrides: Object = {}) {
  count++;

  return Team.create({
    name: `Team ${count}`,
    slackId: uuid.v4(),
    ...overrides,
  });
}

export async function buildUser(overrides: Object = {}) {
  count++;

  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  return User.create({
    email: `user${count}@example.com`,
    username: `user${count}`,
    name: `User ${count}`,
    password: 'test123!',
    service: 'slack',
    serviceId: uuid.v4(),
    ...overrides,
  });
}
