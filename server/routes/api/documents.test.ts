import TestServer from "fetch-test-server";
import {
  Document,
  View,
  Star,
  Revision,
  Backlink,
  CollectionUser,
  SearchQuery,
  Event,
} from "@server/models";
import webService from "@server/services/web";
import {
  buildShare,
  buildCollection,
  buildUser,
  buildDocument,
} from "@server/test/factories";
import { flushdb, seed } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());
beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#documents.info", () => {
  it("should return published document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it("should return archived document", async () => {
    const { user, document } = await seed();
    await document.archive(user.id);
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it("should not return published document in collection not a member of", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      collectionId: collection.id,
    });
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return drafts", async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it("should return document from shareId without token", async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/documents.info", {
      body: {
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.createdBy).toEqual(undefined);
    expect(body.data.updatedBy).toEqual(undefined);
    await share.reload();
    expect(share.lastAccessedAt).toBeTruthy();
  });

  it("should not return document of a deleted collection, when the user was absent in the collection", async () => {
    const user = await buildUser();
    const user2 = await buildUser({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
      createdById: user.id,
    });
    const doc = await buildDocument({
      collectionId: collection.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await server.post("/api/collections.delete", {
      body: {
        id: collection.id,
        token: user.getJwtToken(),
      },
    });
    const res = await server.post("/api/documents.info", {
      body: {
        id: doc.id,
        token: user2.getJwtToken(),
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return document of a deleted collection, when the user was present in the collection", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
      createdById: user.id,
    });
    const doc = await buildDocument({
      collectionId: collection.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await server.post("/api/collections.delete", {
      body: {
        id: collection.id,
        token: user.getJwtToken(),
      },
    });
    const res = await server.post("/api/documents.info", {
      body: {
        id: doc.id,
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(doc.id);
  });
  describe("apiVersion=2", () => {
    it("should return sharedTree from shareId", async () => {
      const { document, collection, user } = await seed();
      const childDocument = await buildDocument({
        teamId: document.teamId,
        parentDocumentId: document.id,
        collectionId: collection.id,
      });
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
        userId: user.id,
        includeChildDocuments: true,
      });
      await collection.addDocumentToStructure(childDocument, 0);
      const res = await server.post("/api/documents.info", {
        body: {
          shareId: share.id,
          id: childDocument.id,
          apiVersion: 2,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.document.id).toEqual(childDocument.id);
      expect(body.data.document.createdBy).toEqual(undefined);
      expect(body.data.document.updatedBy).toEqual(undefined);
      expect(body.data.sharedTree).toEqual(collection.documentStructure?.[0]);
      await share.reload();
      expect(share.lastAccessedAt).toBeTruthy();
    });
    it("should return sharedTree from shareId with id of nested document", async () => {
      const { document, user } = await seed();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
        userId: user.id,
        includeChildDocuments: true,
      });
      const res = await server.post("/api/documents.info", {
        body: {
          shareId: share.id,
          apiVersion: 2,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.document.id).toEqual(document.id);
      expect(body.data.document.createdBy).toEqual(undefined);
      expect(body.data.document.updatedBy).toEqual(undefined);
      expect(body.data.sharedTree).toEqual(document.toJSON());
      await share.reload();
      expect(share.lastAccessedAt).toBeTruthy();
    });
    it("should not return sharedTree if child documents not shared", async () => {
      const { document, user } = await seed();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
        userId: user.id,
        includeChildDocuments: false,
      });
      const res = await server.post("/api/documents.info", {
        body: {
          shareId: share.id,
          apiVersion: 2,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.document.id).toEqual(document.id);
      expect(body.data.document.createdBy).toEqual(undefined);
      expect(body.data.document.updatedBy).toEqual(undefined);
      expect(body.data.sharedTree).toEqual(undefined);
      await share.reload();
      expect(share.lastAccessedAt).toBeTruthy();
    });
    it("should not return details for nested documents", async () => {
      const { document, collection, user } = await seed();
      const childDocument = await buildDocument({
        teamId: document.teamId,
        parentDocumentId: document.id,
        collectionId: collection.id,
      });
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
        userId: user.id,
        includeChildDocuments: false,
      });
      await collection.addDocumentToStructure(childDocument, 0);
      const res = await server.post("/api/documents.info", {
        body: {
          shareId: share.id,
          id: childDocument.id,
          apiVersion: 2,
        },
      });
      expect(res.status).toEqual(403);
    });
    it("should not return document from shareId if sharing is disabled for team", async () => {
      const { document, team, user } = await seed();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
        userId: user.id,
      });
      team.sharing = false;
      await team.save();
      const res = await server.post("/api/documents.info", {
        body: {
          shareId: share.id,
          apiVersion: 2,
        },
      });
      expect(res.status).toEqual(403);
    });
    it("should return document from shareId if public sharing is disabled but the user has permission to read", async () => {
      const { document, collection, team, user } = await seed();
      const share = await buildShare({
        includeChildDocuments: true,
        documentId: document.id,
        teamId: document.teamId,
        userId: user.id,
      });
      team.sharing = false;
      await team.save();
      collection.sharing = false;
      await collection.save();
      const res = await server.post("/api/documents.info", {
        body: {
          token: user.getJwtToken(),
          shareId: share.id,
          apiVersion: 2,
        },
      });
      expect(res.status).toEqual(200);
    });
  });

  it("should not return document from shareId if sharing is disabled for collection", async () => {
    const { document, collection, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    collection.sharing = false;
    await collection.save();
    const res = await server.post("/api/documents.info", {
      body: {
        shareId: share.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not return document from revoked shareId", async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    await share.revoke(user.id);
    const res = await server.post("/api/documents.info", {
      body: {
        shareId: share.id,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not return document from archived shareId", async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    await document.archive(user.id);
    const res = await server.post("/api/documents.info", {
      body: {
        shareId: share.id,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should return document from shareId with token", async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.createdBy.id).toEqual(user.id);
    expect(body.data.updatedBy.id).toEqual(user.id);
    expect(body.policies[0].abilities.update).toEqual(true);
  });

  it("should return draft document from shareId with token", async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.createdBy.id).toEqual(user.id);
    expect(body.data.updatedBy.id).toEqual(user.id);
  });

  it("should return document from shareId in collection not a member of", async () => {
    const { user, document, collection } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    collection.permission = null;
    await collection.save();
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it("should not error if document doesn't exist", async () => {
    const user = await buildUser();
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        id: "test",
      },
    });
    expect(res.status).toEqual(404);
  });

  it("should require authorization without token", async () => {
    const { document } = await seed();
    const res = await server.post("/api/documents.info", {
      body: {
        id: document.id,
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should require authorization with incorrect token", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/documents.info", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require a valid shareId", async () => {
    const res = await server.post("/api/documents.info", {
      body: {
        shareId: 123,
      },
    });
    expect(res.status).toEqual(400);
  });
});

describe("#documents.export", () => {
  it("should return published document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toEqual(document.toMarkdown());
  });

  it("should return archived document", async () => {
    const { user, document } = await seed();
    await document.archive(user.id);
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toEqual(document.toMarkdown());
  });

  it("should not return published document in collection not a member of", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      collectionId: collection.id,
    });
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return drafts", async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toEqual(document.toMarkdown());
  });

  it("should return document from shareId without token", async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/documents.export", {
      body: {
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toEqual(document.toMarkdown());
  });

  it("should not return document from revoked shareId", async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    await share.revoke(user.id);
    const res = await server.post("/api/documents.export", {
      body: {
        shareId: share.id,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not return document from archived shareId", async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    await document.archive(user.id);
    const res = await server.post("/api/documents.export", {
      body: {
        shareId: share.id,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should return document from shareId with token", async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toEqual(document.toMarkdown());
  });

  it("should return draft document from shareId with token", async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toEqual(document.toMarkdown());
  });

  it("should return document from shareId in collection not a member of", async () => {
    const { user, document, collection } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
    });
    collection.permission = null;
    await collection.save();
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        shareId: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toEqual(document.toMarkdown());
  });

  it("should require authorization without token", async () => {
    const { document } = await seed();
    const res = await server.post("/api/documents.export", {
      body: {
        id: document.id,
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should require authorization with incorrect token", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/documents.export", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require a valid shareId", async () => {
    const res = await server.post("/api/documents.export", {
      body: {
        shareId: 123,
      },
    });
    expect(res.status).toEqual(400);
  });
});

describe("#documents.list", () => {
  it("should return documents", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
  });

  it("should allow filtering documents with no parent", async () => {
    const { user, document } = await seed();
    await buildDocument({
      title: "child document",
      text: "random text",
      parentDocumentId: document.id,
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
        parentDocumentId: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
  });

  it("should not return draft documents", async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not return archived documents", async () => {
    const { user, document } = await seed();
    document.archivedAt = new Date();
    await document.save();
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not return documents in private collections not a member of", async () => {
    const { user, collection } = await seed();
    collection.permission = null;
    await collection.save();
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should allow changing sort direction", async () => {
    const { user, document } = await seed();
    const anotherDoc = await buildDocument({
      title: "another document",
      text: "random text",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
        direction: "ASC",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].id).toEqual(document.id);
    expect(body.data[1].id).toEqual(anotherDoc.id);
  });

  it("should allow sorting by collection index", async () => {
    const { user, document, collection } = await seed();
    const anotherDoc = await buildDocument({
      title: "another document",
      text: "random text",
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });
    await collection.addDocumentToStructure(anotherDoc, 0);
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        sort: "index",
        direction: "ASC",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].id).toEqual(anotherDoc.id);
    expect(body.data[1].id).toEqual(document.id);
  });

  it("should allow filtering by collection", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
        collection: document.collectionId,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should allow filtering to private collection", async () => {
    const { user, collection } = await seed();
    collection.permission = null;
    await collection.save();
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
        collection: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should return backlinks", async () => {
    const { user, document } = await seed();
    const anotherDoc = await buildDocument({
      title: "another document",
      text: "random text",
      userId: user.id,
      teamId: user.teamId,
    });
    await Backlink.create({
      reverseDocumentId: anotherDoc.id,
      documentId: document.id,
      userId: user.id,
    });
    const res = await server.post("/api/documents.list", {
      body: {
        token: user.getJwtToken(),
        backlinkDocumentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(anotherDoc.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#documents.drafts", () => {
  it("should return unpublished documents", async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();
    const res = await server.post("/api/documents.drafts", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should not return documents in private collections not a member of", async () => {
    const { user, document, collection } = await seed();
    document.publishedAt = null;
    await document.save();
    collection.permission = null;
    await collection.save();
    const res = await server.post("/api/documents.drafts", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });
});

describe("#documents.search_titles", () => {
  it("should return case insensitive results for partial query", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "Super secret",
    });
    const res = await server.post("/api/documents.search_titles", {
      body: {
        token: user.getJwtToken(),
        query: "SECRET",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
  });

  it("should not include archived or deleted documents", async () => {
    const user = await buildUser();
    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "Super secret",
      archivedAt: new Date(),
    });
    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "Super secret",
      deletedAt: new Date(),
    });
    const res = await server.post("/api/documents.search_titles", {
      body: {
        token: user.getJwtToken(),
        query: "SECRET",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.search_titles");
    expect(res.status).toEqual(401);
  });
});

describe("#documents.search", () => {
  it("should return results", async () => {
    const { user } = await seed();
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "much",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.text).toEqual("# Much test support");
  });

  it("should return results using shareId", async () => {
    const findableDocument = await buildDocument({
      title: "search term",
      text: "random text",
    });

    await buildDocument({
      title: "search term",
      text: "should not be found",
      userId: findableDocument.createdById,
      teamId: findableDocument.teamId,
    });

    const share = await buildShare({
      includeChildDocuments: true,
      documentId: findableDocument.id,
      teamId: findableDocument.teamId,
    });

    const res = await server.post("/api/documents.search", {
      body: {
        query: "search term",
        shareId: share.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(share.documentId);
  });

  it("should not allow search if child documents are not included", async () => {
    const findableDocument = await buildDocument({
      title: "search term",
      text: "random text",
    });

    const share = await buildShare({
      includeChildDocuments: false,
      document: findableDocument,
    });

    const res = await server.post("/api/documents.search", {
      body: {
        query: "search term",
        shareId: share.id,
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should return results in ranked order", async () => {
    const { user } = await seed();
    const firstResult = await buildDocument({
      title: "search term",
      text: "random text",
      userId: user.id,
      teamId: user.teamId,
    });
    const secondResult = await buildDocument({
      title: "random text",
      text: "search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const thirdResult = await buildDocument({
      title: "search term",
      text: "random text",
      userId: user.id,
      teamId: user.teamId,
    });
    thirdResult.title = "change";
    await thirdResult.save();
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(3);
    expect(body.data[0].document.id).toEqual(firstResult.id);
    expect(body.data[1].document.id).toEqual(secondResult.id);
    expect(body.data[2].document.id).toEqual(thirdResult.id);
  });

  it("should return partial results in ranked order", async () => {
    const { user } = await seed();
    const firstResult = await buildDocument({
      title: "search term",
      text: "random text",
      userId: user.id,
      teamId: user.teamId,
    });
    const secondResult = await buildDocument({
      title: "random text",
      text: "search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const thirdResult = await buildDocument({
      title: "search term",
      text: "random text",
      userId: user.id,
      teamId: user.teamId,
    });
    thirdResult.title = "change";
    await thirdResult.save();
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "sear &",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(3);
    expect(body.data[0].document.id).toEqual(firstResult.id);
    expect(body.data[1].document.id).toEqual(secondResult.id);
    expect(body.data[2].document.id).toEqual(thirdResult.id);
  });

  it("should strip junk from search term", async () => {
    const user = await buildUser();
    const firstResult = await buildDocument({
      title: "search term",
      text: "this is some random text of the document body",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "rando &\\;:()",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(firstResult.id);
  });

  it("should not return draft documents", async () => {
    const { user } = await seed();
    await buildDocument({
      title: "search term",
      text: "search term",
      publishedAt: null,
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not error when search term is very long", async () => {
    const { user } = await seed();
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query:
          "much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much much longer search term",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should return draft documents created by user if chosen", async () => {
    const { user } = await seed();
    const document = await buildDocument({
      title: "search term",
      text: "search term",
      publishedAt: null,
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
        includeDrafts: "true",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it("should not return draft documents created by other users", async () => {
    const user = await buildUser();
    await buildDocument({
      title: "search term",
      text: "search term",
      publishedAt: null,
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
        includeDrafts: "true",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not return archived documents", async () => {
    const { user } = await seed();
    const document = await buildDocument({
      title: "search term",
      text: "search term",
      teamId: user.teamId,
    });
    await document.archive(user.id);
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should return archived documents if chosen", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      title: "search term",
      text: "search term",
      teamId: user.teamId,
    });
    await document.archive(user.id);
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
        includeArchived: "true",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it("should return documents for a specific user", async () => {
    const { user } = await seed();
    const document = await buildDocument({
      title: "search term",
      text: "search term",
      teamId: user.teamId,
      userId: user.id,
    });
    // This one will be filtered out
    await buildDocument({
      title: "search term",
      text: "search term",
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
        userId: user.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it("should return documents for a specific private collection", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
    });

    collection.permission = null;
    await collection.save();
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });
    const document = await buildDocument({
      title: "search term",
      text: "search term",
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it("should return documents for a specific collection", async () => {
    const { user } = await seed();
    const collection = await buildCollection();
    const document = await buildDocument({
      title: "search term",
      text: "search term",
      teamId: user.teamId,
    });
    // This one will be filtered out
    await buildDocument({
      title: "search term",
      text: "search term",
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
        collectionId: document.collectionId,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it("should not return documents in private collections not a member of", async () => {
    const { user } = await seed();
    const collection = await buildCollection({
      permission: null,
    });
    await buildDocument({
      title: "search term",
      text: "search term",
      publishedAt: null,
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should expect a query", async () => {
    const { user } = await seed();
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "   ",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow unknown dateFilter values", async () => {
    const { user } = await seed();
    const res = await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "search term",
        dateFilter: "DROP TABLE students;",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.search", {
      body: {
        query: "search term",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should save search term, hits and source", async () => {
    const { user } = await seed();
    await server.post("/api/documents.search", {
      body: {
        token: user.getJwtToken(),
        query: "my term",
      },
    });

    return new Promise((resolve) => {
      // setTimeout is needed here because SearchQuery is saved asynchronously
      // in order to not slow down the response time.
      setTimeout(async () => {
        const searchQuery = await SearchQuery.findAll({
          where: {
            query: "my term",
          },
        });
        expect(searchQuery.length).toBe(1);
        expect(searchQuery[0].results).toBe(0);
        expect(searchQuery[0].source).toBe("app");
        resolve(undefined);
      }, 100);
    });
  });
});

describe("#documents.archived", () => {
  it("should return archived documents", async () => {
    const { user } = await seed();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await document.archive(user.id);
    const res = await server.post("/api/documents.archived", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should not return deleted documents", async () => {
    const { user } = await seed();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await document.delete(user.id);
    const res = await server.post("/api/documents.archived", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not return documents in private collections not a member of", async () => {
    const { user } = await seed();
    const collection = await buildCollection({
      permission: null,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
    });
    await document.archive(user.id);
    const res = await server.post("/api/documents.archived", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.archived");
    expect(res.status).toEqual(401);
  });
});

describe("#documents.viewed", () => {
  it("should return empty result if no views", async () => {
    const { user } = await seed();
    const res = await server.post("/api/documents.viewed", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should return recently viewed documents", async () => {
    const { user, document } = await seed();
    await View.incrementOrCreate({
      documentId: document.id,
      userId: user.id,
    });
    const res = await server.post("/api/documents.viewed", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
    expect(body.policies[0].abilities.update).toEqual(true);
  });

  it("should not return recently viewed but deleted documents", async () => {
    const { user, document } = await seed();
    await View.incrementOrCreate({
      documentId: document.id,
      userId: user.id,
    });
    await document.destroy();
    const res = await server.post("/api/documents.viewed", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not return recently viewed documents in collection not a member of", async () => {
    const { user, document, collection } = await seed();
    await View.incrementOrCreate({
      documentId: document.id,
      userId: user.id,
    });
    collection.permission = null;
    await collection.save();
    const res = await server.post("/api/documents.viewed", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.viewed");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#documents.move", () => {
  it("should move the document", async () => {
    const { user, document } = await seed();
    const collection = await buildCollection({
      teamId: user.teamId,
    });
    const res = await server.post("/api/documents.move", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.documents[0].collectionId).toEqual(collection.id);
    expect(body.policies[0].abilities.move).toEqual(true);
  });

  it("should not allow moving the document to a collection the user cannot access", async () => {
    const { user, document } = await seed();
    const collection = await buildCollection();
    const res = await server.post("/api/documents.move", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        collectionId: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.move");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const { document, collection } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/documents.move", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        collectionId: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#documents.restore", () => {
  it("should allow restore of trashed documents", async () => {
    const { user, document } = await seed();
    await document.destroy();
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.deletedAt).toEqual(null);
  });

  it("should allow restore of trashed documents with collectionId", async () => {
    const { user, document } = await seed();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    await document.destroy();
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.deletedAt).toEqual(null);
    expect(body.data.collectionId).toEqual(collection.id);
  });

  it("should not allow restore of documents in deleted collection", async () => {
    const { user, document, collection } = await seed();
    await document.destroy();
    await collection.destroy();
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow restore of trashed documents to collection user cannot access", async () => {
    const { user, document } = await seed();
    const collection = await buildCollection();
    await document.destroy();
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        collectionId: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow restore of archived documents", async () => {
    const { user, document } = await seed();
    await document.archive(user.id);
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.archivedAt).toEqual(null);
  });

  it("should not add restored templates to collection structure", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
    });
    const template = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
      template: true,
    });
    await template.archive(user.id);
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.archivedAt).toEqual(null);
    await collection.reload();
    expect(collection.documentStructure).toEqual(null);
  });

  it("should restore archived when previous parent is archived", async () => {
    const { user, document } = await seed();
    const childDocument = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: document.collectionId,
      parentDocumentId: document.id,
    });
    await childDocument.archive(user.id);
    await document.archive(user.id);
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: childDocument.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.parentDocumentId).toEqual(null);
    expect(body.data.archivedAt).toEqual(null);
  });

  it("should restore the document to a previous version", async () => {
    const { user, document } = await seed();
    const revision = await Revision.createFromDocument(document);
    const previousText = revision.text;
    const revisionId = revision.id;
    // update the document contents
    document.text = "UPDATED";
    await document.save();
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        revisionId,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.text).toEqual(previousText);
  });

  it("should not allow restoring a revision in another document", async () => {
    const { user, document } = await seed();
    const anotherDoc = await buildDocument();
    const revision = await Revision.createFromDocument(anotherDoc);
    const revisionId = revision.id;
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        revisionId,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not error if document doesn't exist", async () => {
    const user = await buildUser();
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: "test",
      },
    });
    expect(res.status).toEqual(404);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.restore");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const revision = await Revision.createFromDocument(document);
    const revisionId = revision.id;
    const user = await buildUser();
    const res = await server.post("/api/documents.restore", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        revisionId,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#documents.star", () => {
  it("should star the document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.star", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const stars = await Star.findAll();
    expect(res.status).toEqual(200);
    expect(stars.length).toEqual(1);
    expect(stars[0].documentId).toEqual(document.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.star");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/documents.star", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#documents.unstar", () => {
  it("should unstar the document", async () => {
    const { user, document } = await seed();
    await Star.create({
      documentId: document.id,
      userId: user.id,
    });
    const res = await server.post("/api/documents.unstar", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const stars = await Star.findAll();
    expect(res.status).toEqual(200);
    expect(stars.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/documents.star");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/documents.unstar", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#documents.import", () => {
  it("should error if no file is passed", async () => {
    const user = await buildUser();
    const res = await server.post("/api/documents.import", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/documents.import", {
      body: {
        id: document.id,
      },
    });
    expect(res.status).toEqual(401);
  });
});

describe("#documents.create", () => {
  it("should create as a new document", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/documents.create", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        title: "new document",
        text: "hello",
        publish: true,
      },
    });
    const body = await res.json();
    const newDocument = await Document.findByPk(body.data.id);
    expect(res.status).toEqual(200);
    expect(newDocument!.parentDocumentId).toBe(null);
    expect(newDocument!.collectionId).toBe(collection.id);
    expect(body.policies[0].abilities.update).toEqual(true);
  });

  it("should not allow very long titles", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/documents.create", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        title:
          "This is a really long title that is not acceptable to Outline because it is so ridiculously long that we need to have a limit somewhere",
        text: " ",
      },
    });
    expect(res.status).toEqual(400);
  });

  // The length of UTF-8 "🛡" is 2 according to "🛡".length in node,
  // so the length of the title totals to be 101.
  // This test should not pass but does because length of the character
  // calculated by lodash's size function is _.size('🛡') == 1.
  // So the sentence's length comes out to be exactly 100.
  it("should count variable length unicode character using lodash's size function", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/documents.create", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        title:
          "This text would be exactly 100 chars long if the following unicode character was counted as 1 char 🛡",
        text: " ",
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should create as a child and add to collection if published", async () => {
    const { user, document, collection } = await seed();
    const res = await server.post("/api/documents.create", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        parentDocumentId: document.id,
        title: "new document",
        text: "hello",
        publish: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toBe("new document");
    expect(body.policies[0].abilities.update).toEqual(true);
  });

  it("should error with invalid parentDocument", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/documents.create", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        parentDocumentId: "d7a4eb73-fac1-4028-af45-d7e34d54db8e",
        title: "new document",
        text: "hello",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should create as a child and not add to collection", async () => {
    const { user, document, collection } = await seed();
    const res = await server.post("/api/documents.create", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        parentDocumentId: document.id,
        title: "new document",
        text: "hello",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toBe("new document");
    expect(body.policies[0].abilities.update).toEqual(true);
  });
});

describe("#documents.update", () => {
  it("should update document details in the root", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: "Updated title",
        text: "Updated text",
        lastRevision: document.revisionCount,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toBe("Updated title");
    expect(body.data.text).toBe("Updated text");
    const events = await Event.findAll();
    expect(events.length).toEqual(1);
  });

  it("should not add template to collection structure when publishing", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
    });
    const template = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
      template: true,
      publishedAt: null,
    });
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        title: "Updated title",
        text: "Updated text",
        lastRevision: template.revisionCount,
        publish: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toBe("Updated title");
    expect(body.data.text).toBe("Updated text");
    expect(body.data.publishedAt).toBeTruthy();
    await collection.reload();
    expect(collection.documentStructure).toBe(null);
  });

  it("should allow publishing document in private collection", async () => {
    const { user, collection, document } = await seed();
    document.publishedAt = null;
    await document.save();
    collection.permission = null;
    await collection.save();
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: "Updated title",
        text: "Updated text",
        lastRevision: document.revisionCount,
        publish: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.publishedAt).toBeTruthy();
    expect(body.policies[0].abilities.update).toEqual(true);
    const events = await Event.findAll();
    expect(events.length).toEqual(1);
  });

  it("should not edit archived document", async () => {
    const { user, document } = await seed();
    await document.archive(user.id);
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: "Updated title",
        text: "Updated text",
        lastRevision: document.revisionCount,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should fail if document lastRevision does not match", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        text: "Updated text",
        lastRevision: 123,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it("should update document details for children", async () => {
    const { user, document, collection } = await seed();
    collection.documentStructure = [
      {
        id: "af1da94b-9591-4bab-897c-11774b804b77",
        url: "/d/some-beef-RSZwQDsfpc",
        title: "some beef",
        children: [
          {
            id: "ab1da94b-9591-4bab-897c-11774b804b66",
            url: "/d/another-doc-RSZwQDsfpc",
            title: "Another doc",
            children: [],
          },
          { ...document.toJSON(), children: [] },
        ],
      },
    ];
    await collection.save();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: "Updated title",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toBe("Updated title");
  });

  it("allows editing by read-write collection user", async () => {
    const { admin, document, collection } = await seed();
    collection.permission = null;
    await collection.save();
    await CollectionUser.create({
      collectionId: collection.id,
      userId: admin.id,
      createdById: admin.id,
      permission: "read_write",
    });
    const res = await server.post("/api/documents.update", {
      body: {
        token: admin.getJwtToken(),
        id: document.id,
        text: "Changed text",
        lastRevision: document.revisionCount,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.text).toBe("Changed text");
    expect(body.data.updatedBy.id).toBe(admin.id);
  });

  it("does not allow editing by read-only collection user", async () => {
    const { user, document, collection } = await seed();
    collection.permission = null;
    await collection.save();
    await CollectionUser.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: user.id,
      permission: "read",
    });
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        text: "Changed text",
        lastRevision: document.revisionCount,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("does not allow editing in read-only collection", async () => {
    const { user, document, collection } = await seed();
    collection.permission = "read";
    await collection.save();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        text: "Changed text",
        lastRevision: document.revisionCount,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should append document with text", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        text: "Additional text",
        lastRevision: document.revisionCount,
        append: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.text).toBe(document.text + "Additional text");
    expect(body.data.updatedBy.id).toBe(user.id);
  });

  it("should require text while appending", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        lastRevision: document.revisionCount,
        title: "Updated Title",
        append: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it("should allow setting empty text", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        lastRevision: document.revisionCount,
        title: "Updated Title",
        text: "",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.text).toBe("");
  });

  it("should not produce event if nothing changes", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        lastRevision: document.revisionCount,
        title: document.title,
        text: document.text,
      },
    });
    expect(res.status).toEqual(200);
    const events = await Event.findAll();
    expect(events.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/documents.update", {
      body: {
        id: document.id,
        text: "Updated",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/documents.update", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        text: "Updated",
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#documents.archive", () => {
  it("should allow archiving document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.archive", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.updatedBy.id).toEqual(user.id);
    expect(body.data.archivedAt).toBeTruthy();
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/documents.archive", {
      body: {
        id: document.id,
      },
    });
    expect(res.status).toEqual(401);
  });
});

describe("#documents.delete", () => {
  it("should allow deleting document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.delete", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it("should allow permanently deleting a document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await server.post("/api/documents.delete", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const res = await server.post("/api/documents.delete", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        permanent: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it("should allow deleting document without collection", async () => {
    const { user, document, collection } = await seed();
    // delete collection without hooks to trigger document deletion
    await collection.destroy({
      hooks: false,
    });
    const res = await server.post("/api/documents.delete", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/documents.delete", {
      body: {
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#documents.unpublish", () => {
  it("should unpublish a document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/documents.unpublish", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.publishedAt).toBeNull();

    const reloaded = await Document.unscoped().findByPk(document.id);
    expect(reloaded!.createdById).toEqual(user.id);
  });

  it("should unpublish another users document", async () => {
    const { user, collection } = await seed();
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const res = await server.post("/api/documents.unpublish", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.publishedAt).toBeNull();

    const reloaded = await Document.unscoped().findByPk(document.id);
    expect(reloaded!.createdById).toEqual(user.id);
  });

  it("should fail to unpublish a draft document", async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();
    const res = await server.post("/api/documents.unpublish", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should fail to unpublish a deleted document", async () => {
    const { user, document } = await seed();
    await document.delete(user.id);
    const res = await server.post("/api/documents.unpublish", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should fail to unpublish an archived document", async () => {
    const { user, document } = await seed();
    await document.archive(user.id);
    const res = await server.post("/api/documents.unpublish", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/documents.unpublish", {
      body: {
        id: document.id,
      },
    });
    expect(res.status).toEqual(401);
  });
});
