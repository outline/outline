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
