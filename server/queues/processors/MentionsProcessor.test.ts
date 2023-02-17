import { Mention } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import MentionsProcessor from "./MentionsProcessor";

const ip = "127.0.0.1";

setupTestDatabase();

describe("documents.publish", () => {
  test("should create new mention records", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const mentionedUser = await buildUser({
      name: "Alan Kay",
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      title: "Title",
      text: `@[Alan Kay](mention://user/${mentionedUser.id}) is awesome :wink:`,
      teamId: team.id,
      createdById: user.id,
      collectionId: collection.id,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });

    const mentions = await Mention.findAll({
      where: {
        mentionUserId: mentionedUser.id,
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(1);
  });

  test("should not create mention if mentioned user does not exist", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const mentionedUser = await buildUser({
      name: "Alan Kay",
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      title: "Title",
      text: `@[Alan Kay](mention://user/34095ac1-c808-45c0-8c6e-6c554497de64) is awesome :wink:`,
      teamId: team.id,
      createdById: user.id,
      collectionId: collection.id,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });

    const mentions = await Mention.findAll({
      where: {
        mentionUserId: mentionedUser.id,
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(0);
  });
});

describe("documents.update", () => {
  test("should create mention records for newly mentioned users", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const mentionedUser = await buildUser({
      name: "Alan Kay",
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      title: "Title",
      text: `@[Alan Kay](mention://user/${mentionedUser.id}) is awesome :wink:`,
      teamId: team.id,
      createdById: user.id,
      collectionId: collection.id,
      publishedAt: new Date(),
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });

    const mentions = await Mention.findAll({
      where: {
        mentionUserId: mentionedUser.id,
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(1);
  });

  test("should destroy removed mention records", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const mentionedUser = await buildUser({
      name: "Alan Kay",
      teamId: team.id,
    });
    const anotherMentionedUser = await buildUser({
      name: "Bret Victor",
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      title: "Title",
      text: `@[Alan Kay](mention://user/${mentionedUser.id}) is awesome :wink:

@[Bret Victor](mention://user/${anotherMentionedUser.id}) is cool :wink:`,
      teamId: team.id,
      createdById: user.id,
      collectionId: collection.id,
    });
    document.publishedAt = new Date();
    await document.save();

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });

    const mentionsUponPublish = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentionsUponPublish.length).toBe(2);

    document.text = `Alan Kay moved on...

@[Bret Victor](mention://user/${anotherMentionedUser.id}) is still cool :wink:`;

    await document.save();

    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });
    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentions.length).toBe(1);
    expect(mentions[0].mentionUserId).toBe(anotherMentionedUser.id);
  });
});

describe("documents.delete", () => {
  test("should destroy related mentions", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const mentionedUser = await buildUser({
      name: "Alan Kay",
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      title: "Title",
      text: `@[Alan Kay](mention://user/${mentionedUser.id}) is awesome :wink:`,
      teamId: team.id,
      createdById: user.id,
      collectionId: collection.id,
    });
    document.publishedAt = new Date();
    await document.save();

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    const mentionsBeforeDelete = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentionsBeforeDelete.length).toBe(1);

    await processor.perform({
      name: "documents.delete",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentions.length).toBe(0);
  });
});

describe("users.delete", () => {
  test("should destroy or update related mentions", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const mentionedUser = await buildUser({
      name: "Alan Kay",
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      title: "Title",
      text: `@[Alan Kay](mention://user/${mentionedUser.id}) is awesome :wink:`,
      teamId: team.id,
      createdById: user.id,
      collectionId: collection.id,
    });
    document.publishedAt = new Date();
    await document.save();

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    const mentionsBeforeDelete = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentionsBeforeDelete.length).toBe(1);

    await processor.perform({
      name: "users.delete",
      teamId: document.teamId,
      actorId: document.createdById,
      userId: mentionedUser.id,
      ip,
    });
    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentions.length).toBe(0);
  });

  test("should not fail on self mentions", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      name: "Eddy",
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      title: "Title",
      text: `@[${user.name}](mention://user/${user.id}) self-mentioned :wink:`,
      teamId: team.id,
      createdById: user.id,
      collectionId: collection.id,
    });
    document.publishedAt = new Date();
    await document.save();

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    const mentionsBeforeDelete = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentionsBeforeDelete.length).toBe(1);

    await processor.perform({
      name: "users.delete",
      teamId: document.teamId,
      actorId: document.createdById,
      userId: user.id,
      ip,
    });
    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });
    expect(mentions.length).toBe(0);
  });
});
