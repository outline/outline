import { CollectionPermission } from "@shared/types";
import type { Document, Relationship, User } from "@server/models";
import { RelationshipType } from "@server/models/Relationship";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildRelationship,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#relationships.info", () => {
  let admin: User;
  let user: User;
  let anotherUser: User;
  let document: Document;
  let reverseDocument: Document;
  let relationship: Relationship;

  beforeEach(async () => {
    admin = await buildAdmin();
    [user, anotherUser] = await Promise.all([
      buildUser({ teamId: admin.teamId }),
      buildUser(),
    ]);

    document = await buildDocument({
      createdById: admin.id,
      teamId: admin.teamId,
    });

    reverseDocument = await buildDocument({
      createdById: admin.id,
      teamId: admin.teamId,
    });

    relationship = await buildRelationship({
      userId: admin.id,
      documentId: document.id,
      reverseDocumentId: reverseDocument.id,
      type: RelationshipType.Backlink,
    });
  });

  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/relationships.info", {
      body: {
        id: relationship.id,
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should fail with status 400 bad request when id is not supplied", async () => {
    const res = await server.post("/api/relationships.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Required");
  });

  it("should fail with status 400 bad request when id is not a valid UUID", async () => {
    const res = await server.post("/api/relationships.info", {
      body: {
        token: user.getJwtToken(),
        id: "invalid-uuid",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Invalid uuid");
  });

  it("should fail with status 404 not found when relationship does not exist", async () => {
    const res = await server.post("/api/relationships.info", {
      body: {
        token: admin.getJwtToken(),
        id: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(404);
    expect(body.message).toEqual("Resource not found");
  });

  it("should fail with status 403 forbidden when user cannot read the document", async () => {
    const res = await server.post("/api/relationships.info", {
      body: {
        token: anotherUser.getJwtToken(),
        id: relationship.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should succeed with status 200 ok when user can read the document", async () => {
    const res = await server.post("/api/relationships.info", {
      body: {
        token: admin.getJwtToken(),
        id: relationship.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.relationship).toBeTruthy();
    expect(body.data.relationship.id).toEqual(relationship.id);
    expect(body.data.relationship.documentId).toEqual(document.id);
    expect(body.data.relationship.reverseDocumentId).toEqual(
      reverseDocument.id
    );
    expect(body.data.relationship.type).toEqual(RelationshipType.Backlink);
    expect(body.data.documents).toBeTruthy();
    expect(body.data.documents).toHaveLength(2);
    expect(body.policies).toBeTruthy();
  });

  it("should succeed with status 200 ok when user can read document but not reverse document", async () => {
    // Create a relationship where user can read main document but not reverse document
    const userDocument = await buildDocument({
      createdById: user.id,
      teamId: user.teamId,
    });

    const adminDocument = await buildDocument({
      createdById: admin.id,
      teamId: admin.teamId,
    });

    const userRelationship = await buildRelationship({
      userId: user.id,
      documentId: userDocument.id,
      reverseDocumentId: adminDocument.id,
    });

    const res = await server.post("/api/relationships.info", {
      body: {
        token: user.getJwtToken(),
        id: userRelationship.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.relationship).toBeTruthy();
    expect(body.data.documents).toHaveLength(2);
    // User can read their own document but admin document should also be included
    const documentIds = body.data.documents.map((doc: any) => doc.id);
    expect(documentIds).toContain(userDocument.id);
  });

  it("should include both documents when user can read both", async () => {
    // Make user team member so they can read both documents
    const teamUser = await buildUser({ teamId: admin.teamId });

    const res = await server.post("/api/relationships.info", {
      body: {
        token: teamUser.getJwtToken(),
        id: relationship.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.documents).toHaveLength(2);
    const documentIds = body.data.documents.map((doc: any) => doc.id);
    expect(documentIds).toContain(document.id);
    expect(documentIds).toContain(reverseDocument.id);
  });
});

describe("#relationships.list", () => {
  let admin: User;
  let user: User;
  let anotherUser: User; // eslint-disable-line @typescript-eslint/no-unused-vars
  let relationships: Relationship[]; // eslint-disable-line @typescript-eslint/no-unused-vars
  let documents: Document[];

  beforeEach(async () => {
    admin = await buildAdmin();
    [user, anotherUser] = await Promise.all([
      buildUser({ teamId: admin.teamId }),
      buildUser(),
    ]);

    documents = await Promise.all([
      buildDocument({
        createdById: admin.id,
        teamId: admin.teamId,
      }),
      buildDocument({
        createdById: admin.id,
        teamId: admin.teamId,
      }),
      buildDocument({
        createdById: admin.id,
        teamId: admin.teamId,
      }),
    ]);

    relationships = [
      await buildRelationship({
        userId: admin.id,
        documentId: documents[0].id,
        reverseDocumentId: documents[1].id,
        type: RelationshipType.Backlink,
      }),
      await buildRelationship({
        userId: admin.id,
        documentId: documents[1].id,
        reverseDocumentId: documents[2].id,
        type: RelationshipType.Similar,
      }),
      await buildRelationship({
        userId: admin.id,
        documentId: documents[2].id,
        reverseDocumentId: documents[0].id,
        type: RelationshipType.Backlink,
      }),
    ];
  });

  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {},
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should succeed with status 200 ok returning all relationships", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.relationships).toBeTruthy();
    expect(body.data.relationships.length).toBeGreaterThanOrEqual(3);
    expect(body.data.documents).toBeTruthy();
    expect(body.pagination).toBeTruthy();
    expect(body.policies).toBeTruthy();
  });

  it("should succeed with status 200 ok returning relationships filtered by type", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        type: RelationshipType.Backlink,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.relationships).toBeTruthy();

    // All returned relationships should be backlinks
    body.data.relationships.forEach((rel: any) => {
      expect(rel.type).toEqual(RelationshipType.Backlink);
    });
  });

  it("should succeed with status 200 ok returning relationships filtered by documentId", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        documentId: documents[0].id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.relationships).toBeTruthy();

    // All returned relationships should have the specified documentId
    body.data.relationships.forEach((rel: any) => {
      expect(rel.documentId).toEqual(documents[0].id);
    });
  });

  it("should succeed with status 200 ok returning relationships filtered by reverseDocumentId", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        reverseDocumentId: documents[1].id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.relationships).toBeTruthy();

    // All returned relationships should have the specified reverseDocumentId
    body.data.relationships.forEach((rel: any) => {
      expect(rel.reverseDocumentId).toEqual(documents[1].id);
    });
  });

  it("should succeed with status 200 ok returning relationships with multiple filters", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        type: RelationshipType.Backlink,
        documentId: documents[0].id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.relationships).toBeTruthy();

    // All returned relationships should match both filters
    body.data.relationships.forEach((rel: any) => {
      expect(rel.type).toEqual(RelationshipType.Backlink);
      expect(rel.documentId).toEqual(documents[0].id);
    });
  });

  it("should fail with status 400 bad request when documentId is invalid", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        documentId: "invalid-id",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should fail with status 400 bad request when reverseDocumentId is invalid", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        reverseDocumentId: "invalid-id",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toContain("uuid or url slug");
  });

  it("should respect pagination", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        limit: 1,
        offset: 0,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.relationships).toHaveLength(1);
    expect(body.pagination).toBeTruthy();
    expect(body.pagination.limit).toEqual(1);
    expect(body.pagination.offset).toEqual(0);
  });

  it("should return empty results when no relationships match filters", async () => {
    const res = await server.post("/api/relationships.list", {
      body: {
        token: admin.getJwtToken(),
        documentId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.relationships).toHaveLength(0);
    expect(body.data.documents).toHaveLength(0);
  });

  it("should only return documents that the user can read", async () => {
    // Create a relationship where user can only read some documents

    const cannotAccessCollection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: CollectionPermission.Read,
    });
    const userDocument = await buildDocument({
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const cannotAccessDocument = await buildDocument({
      collectionId: cannotAccessCollection.id,
      teamId: admin.teamId,
    });

    await buildRelationship({
      userId: user.id,
      documentId: userDocument.id,
      reverseDocumentId: cannotAccessDocument.id,
    });

    const res = await server.post("/api/relationships.list", {
      body: {
        token: user.getJwtToken(),
        documentId: userDocument.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);

    expect(body.data.relationships).toHaveLength(1);
    expect(body.data.documents).toHaveLength(0);
  });
});
