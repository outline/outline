import { createContext } from "@server/context";
import { sequelize } from "@server/storage/database";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import documentDuplicator from "./documentDuplicator";

describe("documentDuplicator", () => {
  it("should duplicate existing document", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const response = await sequelize.transaction((transaction) =>
      documentDuplicator({
        document: original,
        collection: original.collection,
        user,
        ctx: createContext({ user, transaction }),
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

    const response = await sequelize.transaction((transaction) =>
      documentDuplicator({
        document: original,
        collection: original.collection,
        title: "New title",
        user,
        ctx: createContext({ user, transaction }),
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].title).toEqual("New title");
    expect(response[0].text).toEqual(original.text);
    expect(response[0].icon).toEqual(original.icon);
    expect(response[0].color).toEqual(original.color);
    expect(response[0].publishedAt).toBeInstanceOf(Date);
  });

  it("should duplicate child documents, in the correct order with recursive=true", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      icon: "👋",
      title: "doc 1",
      collectionId: collection.id,
    });

    const child1 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      title: "doc 1.1",
    });

    const child2 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      title: "doc 1.2",
    });

    const child3 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      title: "doc 1.3",
    });

    await collection.addDocumentToStructure(original);
    await collection.addDocumentToStructure(child1);
    await collection.addDocumentToStructure(child2);
    await collection.addDocumentToStructure(child3);

    await sequelize.transaction((transaction) =>
      documentDuplicator({
        title: "duplicate",
        document: original,
        collection: original.collection,
        user,
        recursive: true,
        ctx: createContext({ user, transaction }),
      })
    );

    await collection.reload();
    const duplicate = collection.documentStructure![0];
    const childTitles = duplicate.children!.map((child) => child.title);

    expect(duplicate.title).toEqual("duplicate");
    expect(childTitles.length).toBe(3);
    expect(childTitles[0]).toBe(child1.title);
    expect(childTitles[1]).toBe(child2.title);
    expect(childTitles[2]).toBe(child3.title);
  });

  it("should duplicate existing document as draft", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const response = await sequelize.transaction((transaction) =>
      documentDuplicator({
        document: original,
        collection: original.collection,
        publish: false,
        user,
        ctx: createContext({ user, transaction }),
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
      documentDuplicator({
        document: original,
        collection: original.collection,
        user,
        ctx: createContext({ user, transaction }),
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
      documentDuplicator({
        document: original,
        collection: original.collection,
        user,
        recursive: true,
        ctx: createContext({ user, transaction }),
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
