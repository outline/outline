// @flow
import uuid from "uuid";
import {
  Share,
  Team,
  User,
  Event,
  Document,
  Collection,
  Group,
  GroupUser,
  Attachment,
  Authentication,
  Integration,
} from "../models";

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

  return Share.create({
    published: true,
    ...overrides,
  });
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
    name: "documents.publish",
    ip: "127.0.0.1",
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
    service: "slack",
    serviceId: uuid.v4(),
    createdAt: new Date("2018-01-01T00:00:00.000Z"),
    lastActiveAt: new Date("2018-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

export async function buildIntegration(overrides: Object = {}) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  const user = await buildUser({ teamId: overrides.teamId });

  const authentication = await Authentication.create({
    service: "slack",
    userId: user.id,
    teamId: user.teamId,
    token: "fake-access-token",
    scopes: ["example", "scopes", "here"],
  });

  return Integration.create({
    type: "post",
    service: "slack",
    settings: {
      serviceTeamId: "slack_team_id",
    },
    authenticationId: authentication.id,
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
    const user = await buildUser({ teamId: overrides.teamId });
    overrides.userId = user.id;
  }

  return Collection.create({
    name: `Test Collection ${count}`,
    description: "Test collection description",
    creatorId: overrides.userId,
    ...overrides,
  });
}

export async function buildGroup(overrides: Object = {}) {
  count++;

  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({ teamId: overrides.teamId });
    overrides.userId = user.id;
  }

  return Group.create({
    name: `Test Group ${count}`,
    createdById: overrides.userId,
    ...overrides,
  });
}

export async function buildGroupUser(overrides: Object = {}) {
  count++;

  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({ teamId: overrides.teamId });
    overrides.userId = user.id;
  }

  return GroupUser.create({
    createdById: overrides.userId,
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
    text: "This is the text in an example document",
    publishedAt: new Date(),
    lastModifiedById: overrides.userId,
    createdById: overrides.userId,
    ...overrides,
  });
}

export async function buildAttachment(overrides: Object = {}) {
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

  if (!overrides.documentId) {
    const document = await buildDocument(overrides);
    overrides.documentId = document.id;
  }

  return Attachment.create({
    key: `uploads/key/to/file ${count}.png`,
    url: `https://redirect.url.com/uploads/key/to/file ${count}.png`,
    contentType: "image/png",
    size: 100,
    acl: "public-read",
    createdAt: new Date("2018-01-02T00:00:00.000Z"),
    updatedAt: new Date("2018-01-02T00:00:00.000Z"),
    ...overrides,
  });
}
