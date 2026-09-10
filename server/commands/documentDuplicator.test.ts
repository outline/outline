import { randomUUID } from "node:crypto";
import { MentionType } from "@shared/types";
import { createContext } from "@server/context";
import env from "@server/env";
import { sequelize } from "@server/storage/database";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import { generateUrlId } from "@server/utils/url";
import documentDuplicator from "./documentDuplicator";

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

    await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        title: "duplicate",
        document: original,
        collection: original.collection,
        recursive: true,
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

  it("should remap links between documents in the duplicated tree", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      title: "parent",
    });
    const child2 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      parentDocumentId: original.id,
      title: "child 2",
    });
    const child1 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      parentDocumentId: original.id,
      title: "child 1",
      text: `See [child 2](${child2.path}) and the [parent](/doc/${original.id}).`,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection,
        recursive: true,
      })
    );

    const duplicatedParent = response.find(
      (doc) => doc.sourceMetadata?.originalDocumentId === original.id
    );
    const duplicatedChild1 = response.find(
      (doc) => doc.sourceMetadata?.originalDocumentId === child1.id
    );
    const duplicatedChild2 = response.find(
      (doc) => doc.sourceMetadata?.originalDocumentId === child2.id
    );

    expect(duplicatedChild1!.text).toContain(duplicatedChild2!.path);
    expect(duplicatedChild1!.text).toContain(duplicatedParent!.path);
    expect(duplicatedChild1!.text).not.toContain(child2.urlId);
    expect(duplicatedChild1!.text).not.toContain(original.id);
  });

  it("should remap mentions of documents in the duplicated tree", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      title: "parent",
    });
    const child2 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      parentDocumentId: original.id,
      title: "child 2",
    });
    const child1 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      parentDocumentId: original.id,
      title: "child 1",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "mention",
                attrs: {
                  type: MentionType.Document,
                  modelId: child2.id,
                  label: "child 2",
                  actorId: user.id,
                  id: randomUUID(),
                },
              },
            ],
          },
        ],
      },
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection,
        recursive: true,
      })
    );

    const duplicatedChild1 = response.find(
      (doc) => doc.sourceMetadata?.originalDocumentId === child1.id
    );
    const duplicatedChild2 = response.find(
      (doc) => doc.sourceMetadata?.originalDocumentId === child2.id
    );
    const mention = duplicatedChild1!.content!.content![0].content![0];

    expect(mention.attrs!.modelId).toEqual(duplicatedChild2!.id);
  });

  it("should not remap links to documents outside of the duplicated tree", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const other = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      title: "other",
    });
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      title: "parent",
      text: `See [other](${other.path}) and [elsewhere](https://example.com/doc/${other.urlId}).`,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection,
        recursive: true,
      })
    );

    expect(response[0].text).toContain(other.path);
    expect(response[0].text).toContain(
      `https://example.com/doc/${other.urlId}`
    );
  });

  it("should remap self links when duplicating a single document", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const urlId = generateUrlId();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      title: "parent",
      urlId,
      text: [
        `Relative [top](/doc/parent-${urlId}).`,
        `Qualified [top](${env.URL}/doc/parent-${urlId}).`,
        `Plain <${env.URL}/doc/parent-${urlId}>`,
      ].join("\n\n"),
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection,
        title: "parent (copy)",
      })
    );

    expect(response[0].text).toContain(`(${response[0].path})`);
    expect(response[0].text).toContain(`(${env.URL}${response[0].path})`);
    expect(response[0].text).toContain(`<${env.URL}${response[0].path}>`);
    expect(response[0].text).not.toContain(original.urlId);
  });

  it("should copy fullWidth property when duplicating document", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      fullWidth: true,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].fullWidth).toBe(true);
  });

  it("should copy fullWidth property to child documents when duplicating recursively", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      fullWidth: true,
      collectionId: collection.id,
    });

    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      fullWidth: true,
      collectionId: collection.id,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
        recursive: true,
      })
    );

    expect(response).toHaveLength(2);

    // Check parent document
    const duplicatedParent = response.find((doc) => !doc.parentDocumentId);
    expect(duplicatedParent?.fullWidth).toBe(true);

    // Check child document
    const duplicatedChild = response.find((doc) => doc.parentDocumentId);
    expect(duplicatedChild?.fullWidth).toBe(true);
  });
});
