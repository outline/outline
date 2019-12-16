// @flow
import { Share, Team, User, Event, Document, Collection } from '../models';
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

export function buildEvent(overrides: Object = {}) {
  return Event.create({
    name: 'documents.publish',
    ip: '127.0.0.1',
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
    service: 'slack',
    serviceId: uuid.v4(),
    createdAt: new Date('2018-01-01T00:00:00.000Z'),
    lastActiveAt: new Date('2018-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

export async function buildCollection(overrides: Object = {}) {
  count++;

  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }

  return Collection.create({
    name: 'Test Collection',
    description: 'Test collection description',
    creatorId: overrides.userId,
    type: 'atlas',
    ...overrides,
  });
}

export async function buildDocument(overrides: Object = {}) {
  count++;

  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }

  if (!overrides.collectionId) {
    const collection = await buildCollection(overrides);
    overrides.collectionId = collection.id;
  }

  return Document.create({
    title: `Document ${count}`,
    text: 'This is the text in an example document',
    publishedAt: new Date(),
    lastModifiedById: overrides.userId,
    createdById: overrides.userId,
    ...overrides,
  });
}
