// @flow
import { Attachment } from "../models";
import {
  buildDocument,
  buildAttachment,
  buildCollection,
  buildUser,
} from "../test/factories";
import { flushdb, seed } from "../test/support";
import parseAttachmentIds from "../utils/parseAttachmentIds";
import documentMover from "./documentMover";

beforeEach(() => flushdb());

describe("documentMover", () => {
  const ip = "127.0.0.1";

  it("should move within a collection", async () => {
    const { document, user, collection } = await seed();

    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      ip,
    });

    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
  });

  it("should not error when not in source collection documentStructure", async () => {
    const user = await buildUser();
    const collection = await buildCollection({ teamId: user.teamId });
    const document = await buildDocument({ collectionId: collection.id });
    await document.archive();

    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      ip,
    });

    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
  });

  it("should move with children", async () => {
    const { document, user, collection } = await seed();
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);

    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });

    expect(response.collections[0].documentStructure[0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
    expect(response.documents[0].collection.id).toEqual(collection.id);
  });

  it("should move with children to another collection", async () => {
    const { document, user, collection } = await seed();
    const newCollection = await buildCollection({
      teamId: collection.teamId,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);

    const response = await documentMover({
      user,
      document,
      collectionId: newCollection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });

    // check document ids where updated
    await newDocument.reload();
    expect(newDocument.collectionId).toBe(newCollection.id);

    await document.reload();
    expect(document.collectionId).toBe(newCollection.id);

    // check collection structure updated
    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections[1].id).toBe(newCollection.id);
    expect(response.collections[1].documentStructure[0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(2);
    expect(response.documents.length).toEqual(2);
    expect(response.documents[0].collection.id).toEqual(newCollection.id);
    expect(response.documents[1].collection.id).toEqual(newCollection.id);
  });

  it("should move attachments in children to another collection", async () => {
    const { document, user, collection } = await seed();
    const newCollection = await buildCollection({
      teamId: collection.teamId,
    });
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: `content ![attachment](${attachment.redirectUrl})`,
    });
    await collection.addDocumentToStructure(newDocument);

    await documentMover({
      user,
      document,
      collectionId: newCollection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });

    // check document ids where updated
    await newDocument.reload();
    expect(newDocument.collectionId).toBe(newCollection.id);

    // check new attachment was created pointint to same key
    const attachmentIds = parseAttachmentIds(newDocument.text);
    const newAttachment = await Attachment.findByPk(attachmentIds[0]);
    expect(newAttachment.documentId).toBe(newDocument.id);
    expect(newAttachment.key).toBe(attachment.key);

    await document.reload();
    expect(document.collectionId).toBe(newCollection.id);
  });
});
