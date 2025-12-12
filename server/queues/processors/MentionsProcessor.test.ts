import { v4 as uuidv4 } from "uuid";
import { parser } from "@server/editor";
import { Mention } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import MentionsProcessor from "./MentionsProcessor";

describe("MentionsProcessor", () => {
  it("should create new mention records", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const mentionId = uuidv4();
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @[${mentionedUser.name}](mention://${mentionId}/user/${mentionedUser.id})!`,
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
    const mentionId = uuidv4();
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @[${mentionedUser.name}](mention://${mentionId}/user/${mentionedUser.id})!`,
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
    const mentionId1 = uuidv4();
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @[${mentionedUser.name}](mention://${mentionId1}/user/${mentionedUser.id})!`,
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
    const mentionId2 = uuidv4();
    const newText = `Hello @[${anotherMentionedUser.name}](mention://${mentionId2}/user/${anotherMentionedUser.id})!`;
    document.text = newText;
    document.content = parser.parse(newText)?.toJSON() || document.content;
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

  it("should destroy removed mention records", async () => {
    const user = await buildUser();
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const anotherMentionedUser = await buildUser({ teamId: user.teamId });
    const mentionId1 = uuidv4();
    const mentionId2 = uuidv4();
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @[${mentionedUser.name}](mention://${mentionId1}/user/${mentionedUser.id}) and @[${anotherMentionedUser.name}](mention://${mentionId2}/user/${anotherMentionedUser.id})!`,
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
    const mentionId3 = uuidv4();
    const newText = `Hello @[${mentionedUser.name}](mention://${mentionId3}/user/${mentionedUser.id})!`;
    document.text = newText;
    document.content = parser.parse(newText)?.toJSON() || document.content;
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
    const mentionId = uuidv4();
    const document = await buildDocument({
      userId: user.id!,
      teamId: user.teamId!,
      text: `Hello @[${mentionedUser.name}](mention://${mentionId}/user/${mentionedUser.id})!`,
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
