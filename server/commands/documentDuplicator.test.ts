import { buildDocument, buildUser } from "@server/test/factories";
import documentDuplicator from "./documentDuplicator";
import { withAPIContext } from "@server/test/support";
import { sequelize } from "@server/storage/database";
import { createContext } from "@server/context";

describe("documentDuplicator", () => {
  it("should duplicate existing document", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].title).toEqual(original.title);
    expect(response[0].text).toEqual(original.text);
    expect(response[0].icon).toEqual(original.icon);
    expect(response[0].color).toEqual(original.color);
    expect(response[0].publishedAt).toBeInstanceOf(Date);
  });

  it("should duplicate document with title override", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      icon: "👋",
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
        title: "New title",
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].title).toEqual("New title");
    expect(response[0].text).toEqual(original.text);
    expect(response[0].icon).toEqual(original.icon);
    expect(response[0].color).toEqual(original.color);
    expect(response[0].publishedAt).toBeInstanceOf(Date);
  });

  it("should duplicate child documents with recursive=true", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      icon: "👋",
    });

    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      collection: original.collection,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
        recursive: true,
      })
    );

    expect(response).toHaveLength(2);
  });

  it("should duplicate existing document as draft", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
        publish: false,
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].title).toEqual(original.title);
    expect(response[0].text).toEqual(original.text);
    expect(response[0].icon).toEqual(original.icon);
    expect(response[0].color).toEqual(original.color);
    expect(response[0].publishedAt).toBeNull();
  });

  it("should set originalDocumentId in sourceMetadata when duplicating", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      sourceMetadata: { fileName: "test.md", externalId: "ext123" },
    });

    const response = await sequelize.transaction((transaction) =>
      documentDuplicator(createContext({ user, transaction }), {
        document: original,
        collection: original.collection,
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].sourceMetadata).toEqual({
      fileName: "test.md",
      externalId: "ext123",
      originalDocumentId: original.id,
    });
  });

  it("should set originalDocumentId for child documents when duplicating recursively", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const childDocument = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      collection: original.collection,
      sourceMetadata: { fileName: "child.md" },
    });

    const response = await sequelize.transaction((transaction) =>
      documentDuplicator(createContext({ user, transaction }), {
        document: original,
        collection: original.collection,
        recursive: true,
      })
    );

    expect(response).toHaveLength(2);

    // Check parent document
    const duplicatedParent = response.find((doc) => !doc.parentDocumentId);
    expect(duplicatedParent?.sourceMetadata?.originalDocumentId).toEqual(
      original.id
    );

    // Check child document
    const duplicatedChild = response.find((doc) => doc.parentDocumentId);
    expect(duplicatedChild?.sourceMetadata?.originalDocumentId).toEqual(
      childDocument.id
    );
    expect(duplicatedChild?.sourceMetadata?.fileName).toEqual("child.md");
  });
});
