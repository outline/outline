import { Star } from "@server/models";
import { buildDocument, buildStar, buildUser } from "@server/test/factories";
import DocumentArchivedProcessor from "./DocumentArchivedProcessor";

const ip = "127.0.0.1";

describe("DocumentArchivedProcessor", () => {
  test("should remove document from actor's starred documents", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    // Create a star for the document by the user
    await buildStar({
      userId: user.id,
      documentId: document.id,
    });
    
    // Verify the star exists
    expect(
      await Star.count({
        where: {
          userId: user.id,
          documentId: document.id,
        },
      })
    ).toBe(1);

    // Run the processor
    const processor = new DocumentArchivedProcessor();
    await processor.perform({
      name: "documents.archive",
      documentId: document.id,
      collectionId: document.collectionId!,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    // Verify the star has been removed
    expect(
      await Star.count({
        where: {
          userId: user.id,
          documentId: document.id,
        },
      })
    ).toBe(0);
  });

  test("should not remove document from other users' starred documents", async () => {
    const actor = await buildUser();
    const otherUser = await buildUser({ teamId: actor.teamId });
    const document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
    });
    
    // Create stars for both users
    await buildStar({
      userId: actor.id,
      documentId: document.id,
    });
    await buildStar({
      userId: otherUser.id,
      documentId: document.id,
    });
    // Verify both stars exist
    expect(
      await Star.count({
        where: {
          documentId: document.id,
        },
      })
    ).toBe(2);

    // Run the processor (actor archives the document)
    const processor = new DocumentArchivedProcessor();
    await processor.perform({
      name: "documents.archive",
      documentId: document.id,
      collectionId: document.collectionId!,
      actorId: actor.id,
      teamId: actor.teamId,
      ip,
    });

    // Verify only the actor's star has been removed
    expect(
      await Star.count({
        where: {
          userId: actor.id,
          documentId: document.id,
        },
      })
    ).toBe(0);
    
    // Verify the other user's star still exists
    expect(
      await Star.count({
        where: {
          userId: otherUser.id,
          documentId: document.id,
        },
      })
    ).toBe(1);
  });

  test("should not fail if document is not starred by actor", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    // Do not create a star for the document
    // Verify the star doesn't exist
    expect(
      await Star.count({
        where: {
          userId: user.id,
          documentId: document.id,
        },
      })
    ).toBe(0);

    // Run the processor (should not fail)
    const processor = new DocumentArchivedProcessor();
    await processor.perform({
      name: "documents.archive",
      documentId: document.id,
      collectionId: document.collectionId!,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    // Verify the star still doesn't exist (no error occurred)
    expect(
      await Star.count({
        where: {
          userId: user.id,
          documentId: document.id,
        },
      })
    ).toBe(0);
  });
});
