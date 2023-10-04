import { faker } from "@faker-js/faker";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";
import randomstring from "randomstring";
import { v4 as uuidv4 } from "uuid";
import {
  CollectionPermission,
  FileOperationState,
  FileOperationType,
  IntegrationService,
  IntegrationType,
  NotificationEventType,
} from "@shared/types";
import {
  Share,
  Team,
  User,
  Event,
  Document,
  Star,
  Collection,
  Group,
  GroupUser,
  Attachment,
  IntegrationAuthentication,
  Integration,
  FileOperation,
  WebhookSubscription,
  WebhookDelivery,
  ApiKey,
  Subscription,
  Notification,
  SearchQuery,
  Pin,
} from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";

export async function buildApiKey(overrides: Partial<ApiKey> = {}) {
  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }

  return ApiKey.create({
    name: faker.lorem.words(3),
    ...overrides,
  });
}

export async function buildShare(overrides: Partial<Share> = {}) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  if (!overrides.documentId) {
    const document = await buildDocument({
      createdById: overrides.userId,
      teamId: overrides.teamId,
    });
    overrides.documentId = document.id;
  }

  return Share.create({
    published: true,
    ...overrides,
  });
}

export async function buildStar(overrides: Partial<Star> = {}) {
  let user;

  if (overrides.userId) {
    user = await User.findByPk(overrides.userId, {
      rejectOnEmpty: true,
    });
  } else {
    user = await buildUser();
    overrides.userId = user.id;
  }

  if (!overrides.documentId) {
    const document = await buildDocument({
      createdById: overrides.userId,
      teamId: user.teamId,
    });
    overrides.documentId = document.id;
  }

  return Star.create({
    index: "h",
    ...overrides,
  });
}

export async function buildSubscription(overrides: Partial<Subscription> = {}) {
  let user;

  if (overrides.userId) {
    user = await User.findByPk(overrides.userId, {
      rejectOnEmpty: true,
    });
  } else {
    user = await buildUser();
    overrides.userId = user.id;
  }

  if (!overrides.documentId) {
    const document = await buildDocument({
      createdById: overrides.userId,
      teamId: user.teamId,
    });
    overrides.documentId = document.id;
  }

  return Subscription.create({
    enabled: true,
    event: "documents.update",
    ...overrides,
  });
}

export function buildTeam(overrides: Record<string, any> = {}) {
  return Team.create(
    {
      name: faker.company.name(),
      authenticationProviders: [
        {
          name: "slack",
          providerId: randomstring.generate(32),
        },
      ],
      ...overrides,
    },
    {
      include: "authenticationProviders",
    }
  );
}

export function buildEvent(overrides: Partial<Event> = {}) {
  return Event.create({
    name: "documents.publish",
    ip: "127.0.0.1",
    ...overrides,
  });
}

export async function buildGuestUser(overrides: Partial<User> = {}) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  return User.create({
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    createdAt: new Date("2018-01-01T00:00:00.000Z"),
    lastActiveAt: new Date("2018-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

export async function buildUser(overrides: Partial<User> = {}) {
  let team;

  if (!overrides.teamId) {
    team = await buildTeam();
    overrides.teamId = team.id;
  } else {
    team = await Team.findByPk(overrides.teamId, {
      include: "authenticationProviders",
      rejectOnEmpty: true,
      paranoid: false,
    });
  }

  const authenticationProvider = team.authenticationProviders[0];
  const user = await User.create(
    {
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      createdAt: new Date("2018-01-01T00:00:00.000Z"),
      updatedAt: new Date("2018-01-02T00:00:00.000Z"),
      lastActiveAt: new Date("2018-01-03T00:00:00.000Z"),
      authentications: authenticationProvider
        ? [
            {
              authenticationProviderId: authenticationProvider.id,
              providerId: randomstring.generate(32),
            },
          ]
        : [],
      ...overrides,
    },
    {
      include: "authentications",
    }
  );

  if (team) {
    user.team = team;
  }
  return user;
}

export async function buildAdmin(overrides: Partial<User> = {}) {
  return buildUser({ ...overrides, isAdmin: true });
}

export async function buildViewer(overrides: Partial<User> = {}) {
  return buildUser({ ...overrides, isViewer: true });
}

export async function buildInvite(overrides: Partial<User> = {}) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  const actor = await buildUser({ teamId: overrides.teamId });

  return User.create({
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    createdAt: new Date("2018-01-01T00:00:00.000Z"),
    invitedById: actor.id,
    authentications: [],
    ...overrides,
    lastActiveAt: null,
  });
}

export async function buildIntegration(overrides: Partial<Integration> = {}) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  const user = await buildUser({
    teamId: overrides.teamId,
  });
  const authentication = await IntegrationAuthentication.create({
    service: IntegrationService.Slack,
    userId: user.id,
    teamId: user.teamId,
    token: randomstring.generate(32),
    scopes: ["example", "scopes", "here"],
  });
  return Integration.create({
    service: IntegrationService.Slack,
    type: IntegrationType.Post,
    events: ["documents.update", "documents.publish"],
    settings: {
      serviceTeamId: uuidv4(),
    },
    authenticationId: authentication.id,
    ...overrides,
  });
}

export async function buildCollection(
  overrides: Partial<Collection> & { userId?: string } = {}
) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  return Collection.create({
    name: faker.lorem.words(2),
    description: faker.lorem.words(4),
    createdById: overrides.userId,
    permission: CollectionPermission.ReadWrite,
    ...overrides,
  });
}

export async function buildGroup(
  overrides: Partial<Group> & { userId?: string } = {}
) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  return Group.create({
    name: faker.lorem.words(2),
    createdById: overrides.userId,
    ...overrides,
  });
}

export async function buildGroupUser(
  overrides: Partial<GroupUser> & { userId?: string; teamId?: string } = {}
) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  return GroupUser.create({
    createdById: overrides.userId,
    ...overrides,
  });
}

export async function buildDraftDocument(
  overrides: Partial<Document> & { userId?: string } = {}
) {
  return buildDocument({ ...overrides, publishedAt: null });
}

export async function buildDocument(
  // Omission first, addition later?
  // This is actually a workaround to allow
  // passing collectionId as null. Ideally, it
  // should be updated in the Document model itself
  // but that'd cascade and require further changes
  // beyond the scope of what's required now
  overrides: Omit<Partial<Document>, "collectionId"> & { userId?: string } & {
    collectionId?: string | null;
  } = {}
) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }

  let collection;
  if (overrides.collectionId === undefined) {
    collection = await buildCollection({
      teamId: overrides.teamId,
      userId: overrides.userId,
    });
    overrides.collectionId = collection.id;
  }

  const document = await Document.create(
    {
      title: faker.lorem.words(4),
      text: "This is the text in an example document",
      publishedAt: isNull(overrides.collectionId) ? null : new Date(),
      lastModifiedById: overrides.userId,
      createdById: overrides.userId,
      editorVersion: 2,
      ...overrides,
    },
    {
      silent: overrides.createdAt || overrides.updatedAt ? true : false,
    }
  );

  if (overrides.collectionId && overrides.publishedAt !== null) {
    collection = collection
      ? await Collection.findByPk(overrides.collectionId)
      : undefined;

    await collection?.addDocumentToStructure(document, 0);
  }

  return document;
}

export async function buildFileOperation(
  overrides: Partial<FileOperation> = {}
) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildAdmin({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  return FileOperation.create({
    state: FileOperationState.Creating,
    type: FileOperationType.Export,
    size: 0,
    key: "uploads/key/to/file.zip",
    collectionId: null,
    url: "https://www.urltos3file.com/file.zip",
    ...overrides,
  });
}

export async function buildAttachment(
  overrides: Partial<Attachment> = {},
  fileName?: string
) {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  if (!overrides.documentId) {
    const document = await buildDocument({
      teamId: overrides.teamId,
      userId: overrides.userId,
    });
    overrides.documentId = document.id;
  }

  const id = uuidv4();
  const acl = overrides.acl || "public-read";
  const name = fileName || faker.system.fileName();
  return Attachment.create({
    key: AttachmentHelper.getKey({ acl, id, name, userId: overrides.userId }),
    contentType: "image/png",
    size: 100,
    acl,
    createdAt: new Date("2018-01-02T00:00:00.000Z"),
    updatedAt: new Date("2018-01-02T00:00:00.000Z"),
    ...overrides,
  });
}

export async function buildWebhookSubscription(
  overrides: Partial<WebhookSubscription> = {}
): Promise<WebhookSubscription> {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }
  if (!overrides.createdById) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.createdById = user.id;
  }
  if (!overrides.name) {
    overrides.name = "Test Webhook Subscription";
  }
  if (!overrides.url) {
    overrides.url = "https://www.example.com/webhook";
  }
  if (!overrides.events) {
    overrides.events = ["*"];
  }
  if (!overrides.enabled) {
    overrides.enabled = true;
  }

  return WebhookSubscription.create(overrides);
}

export async function buildWebhookDelivery(
  overrides: Partial<WebhookDelivery> = {}
): Promise<WebhookDelivery> {
  if (!overrides.status) {
    overrides.status = "success";
  }
  if (!overrides.statusCode) {
    overrides.statusCode = 200;
  }
  if (!overrides.requestBody) {
    overrides.requestBody = "{}";
  }
  if (!overrides.requestHeaders) {
    overrides.requestHeaders = {};
  }
  if (!overrides.webhookSubscriptionId) {
    const webhookSubscription = await buildWebhookSubscription();
    overrides.webhookSubscriptionId = webhookSubscription.id;
  }
  if (!overrides.createdAt) {
    overrides.createdAt = new Date();
  }

  return WebhookDelivery.create(overrides);
}

export async function buildNotification(
  overrides: Partial<Notification> = {}
): Promise<Notification> {
  if (!overrides.event) {
    overrides.event = NotificationEventType.UpdateDocument;
  }

  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  return Notification.create(overrides);
}

export async function buildSearchQuery(
  overrides: Partial<SearchQuery> = {}
): Promise<SearchQuery> {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.userId) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.userId = user.id;
  }

  if (!overrides.source) {
    overrides.source = "app";
  }

  if (isNil(overrides.query)) {
    overrides.query = "query";
  }

  if (isNil(overrides.results)) {
    overrides.results = 1;
  }

  return SearchQuery.create(overrides);
}

export async function buildPin(overrides: Partial<Pin> = {}): Promise<Pin> {
  if (!overrides.teamId) {
    const team = await buildTeam();
    overrides.teamId = team.id;
  }

  if (!overrides.createdById) {
    const user = await buildUser({
      teamId: overrides.teamId,
    });
    overrides.createdById = user.id;
  }

  if (!overrides.documentId) {
    const document = await buildDocument({
      teamId: overrides.teamId,
    });
    overrides.documentId = document.id;
  }

  return Pin.create(overrides);
}
