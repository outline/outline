import { Mention } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import MentionsProcessor from "./MentionsProcessor";

describe("MentionsProcessor", () => {
  it("should create new mention records", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @${mentionedUser.name}!`,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      data: {
        title: document.title,
      },
      ip: "127.0.0.1",
    });

    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(1);
  });

  it("should not create mention records for unpublished documents", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @${mentionedUser.name}!`,
      publishedAt: null,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      createdAt: new Date().toISOString(),
      actorId: user.id!,
      data: {
        title: document.title,
        autosave: false,
        done: true,
      },
      ip: "127.0.0.1",
    });

    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(0);
  });

  it("should update mention records when document is updated", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const anotherMentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @${mentionedUser.name}!`,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      data: {
        title: document.title,
      },
      ip: "127.0.0.1",
    });

    // Update document to mention a different user
    document.text = `Hello @${anotherMentionedUser.name}!`;
    await document.save();

    await processor.perform({
      name: "documents.update",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      createdAt: new Date().toISOString(),
      data: {
        title: document.title,
        autosave: false,
        done: true,
      },
      ip: "127.0.0.1",
    });

    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(1);
    expect(mentions[0].mentionedUserId).toBe(anotherMentionedUser.id);
  });

  it("should create new mention records", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @${mentionedUser.name}!`,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      data: {
        title: document.title,
      },
      ip: "127.0.0.1",
    });

    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(1);
  });

  it("should destroy removed mention records", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const anotherMentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @${mentionedUser.name} and @${anotherMentionedUser.name}!`,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      data: {
        title: document.title,
      },
      ip: "127.0.0.1",
    });

    // Update document to remove one mention
    document.text = `Hello @${mentionedUser.name}!`;
    await document.save();

    await processor.perform({
      name: "documents.update",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      createdAt: new Date().toISOString(),
      data: {
        title: document.title,
        autosave: false,
        done: true,
      },
      ip: "127.0.0.1",
    });

    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(1);
    expect(mentions[0].mentionedUserId).toBe(mentionedUser.id);
  });

  it("should destroy related mentions", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @${mentionedUser.name}!`,
    });

    const processor = new MentionsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      data: {
        title: document.title,
      },
      ip: "127.0.0.1",
    });

    await processor.perform({
      name: "documents.delete",
      documentId: document.id!,
      collectionId: document.collectionId!,
      teamId: document.teamId!,
      actorId: user.id!,
      data: {
        title: document.title,
      },
      ip: "127.0.0.1",
    });

    const mentions = await Mention.findAll({
      where: {
        documentId: document.id,
      },
    });

    expect(mentions.length).toBe(0);
  });
});
