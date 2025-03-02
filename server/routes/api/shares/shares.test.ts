import { CollectionPermission } from "@shared/types";
import { createContext } from "@server/context";
import { UserMembership, Share } from "@server/models";
import {
  buildUser,
  buildDocument,
  buildShare,
  buildAdmin,
  buildCollection,
  buildTeam,
} from "@server/test/factories";

import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#shares.list", () => {
  it("should fail with status 400 bad request when an invalid sort value is suppled", async () => {
    const user = await buildUser();
    const res = await server.post("/api/shares.list", {
      body: {
        token: user.getJwtToken(),
        sort: "foo",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      `sort: must be one of ${Object.keys(Share.getAttributes()).join(", ")}`
    );
  });

  it("should only return shares created by user", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ userId: user.id, teamId: team.id });
    await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: admin.id,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(share.id);
    expect(body.data[0].documentTitle).toBe(document.title);
  });

  it("should allow filtering by document title", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "hardcoded",
    });
    await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.list", {
      body: {
        token: user.getJwtToken(),
        query: "test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should allow filtering by document title and return matching shares", async () => {
    const user = await buildUser();
    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "test",
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.list", {
      body: {
        token: user.getJwtToken(),
        query: "test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(share.id);
    expect(body.data[0].documentTitle).toBe("test");
  });

  it("should not return revoked shares", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await share.revoke(createContext({ user }));
    const res = await server.post("/api/shares.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not return unpublished shares", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await buildShare({
      published: false,
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not return shares to deleted documents", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await document.delete(user);
    const res = await server.post("/api/shares.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("admins should return shares created by all users", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ userId: user.id, teamId: team.id });
    const share = await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(share.id);
    expect(body.data[0].documentTitle).toBe(document.title);
  });

  it("admins should not return shares in collection not a member of", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: admin.id,
    });
    collection.permission = null;
    await collection.save();
    const res = await server.post("/api/shares.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/shares.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#shares.create", () => {
  it("should fail with status 400 bad request when documentId is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("documentId: Required");
  });

  it("should fail with status 400 bad request when documentId is invalid", async () => {
    const user = await buildUser();
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: "id",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("documentId: must be uuid or url slug");
  });

  it("should allow creating a share record for document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.published).toBe(false);
    expect(body.data.documentTitle).toBe(document.title);
  });

  it("should allow creating a published share record for document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        includeChildDocuments: true,
        published: true,
        urlId: "test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.published).toBe(true);
    expect(body.data.includeChildDocuments).toBe(true);
    expect(body.data.urlId).toBe("test");
    expect(body.data.documentTitle).toBe(document.title);
  });

  it("should fail creating a share record with read-only permissions and publishing", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.update(
      {
        userId: user.id,
        permission: CollectionPermission.Read,
      },
      {
        where: {
          createdById: user.id,
          collectionId: collection.id,
        },
      }
    );
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        published: true,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow creating a share record with read-only permissions but not publishing", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.update(
      {
        userId: user.id,
        permission: CollectionPermission.Read,
      },
      {
        where: {
          createdById: user.id,
          collectionId: collection.id,
        },
      }
    );
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    const response = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: body.data.id,
        published: true,
      },
    });
    expect(response.status).toEqual(403);
  });

  it("should allow creating a share record if link previously revoked", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await share.revoke(createContext({ user }));
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(share.id);
    expect(body.data.documentTitle).toBe(document.title);
  });

  it("should return existing share link for document and user", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBe(share.id);
  });

  it("should allow creating a share record if team sharing disabled but not publishing", async () => {
    const team = await buildTeam({ sharing: false });
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    const response = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: body.data.id,
        published: true,
      },
    });
    expect(response.status).toEqual(403);
  });

  it("should allow creating a share record if collection sharing disabled but not publishing", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
      sharing: false,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    const response = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: body.data.id,
        published: true,
      },
    });
    expect(response.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const document = await buildDocument();
    const res = await server.post("/api/shares.create", {
      body: {
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const document = await buildDocument();
    const user = await buildUser();
    const res = await server.post("/api/shares.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#shares.info", () => {
  it("should fail with status 400 bad request when id and documentId both are missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("body: id or documentId is required");
  });

  it("should fail with status 400 bad request when documentId is invalid", async () => {
    const user = await buildUser();
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        documentId: "id",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("documentId: must be uuid or url slug");
  });

  it("should not find share by documentId in private collection", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      permission: null,
      teamId: admin.teamId,
    });
    const document = await buildDocument({
      collectionId: collection.id,
      userId: admin.id,
      teamId: admin.teamId,
    });
    const user = await buildUser({
      teamId: admin.teamId,
    });
    await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: admin.id,
    });
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.info", {
      body: {
        id: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id });
    const user = await buildUser();
    const share = await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: admin.id,
    });
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should succeed with status 200 ok", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      createdById: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.shares).toBeTruthy();
    expect(body.data.shares).toHaveLength(1);
    expect(body.data.shares[0].id).toEqual(share.id);
  });

  it("should allow reading share by documentId", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.shares.length).toBe(1);
    expect(body.data.shares[0].id).toBe(share.id);
    expect(body.data.shares[0].published).toBe(true);
  });
  it("should return share for parent document with includeChildDocuments=true", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
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
    await collection.reload();
    await collection.addDocumentToStructure(childDocument, 0);
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        documentId: childDocument.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.shares.length).toBe(1);
    expect(body.data.shares[0].id).toBe(share.id);
    expect(body.data.shares[0].documentId).toBe(document.id);
    expect(body.data.shares[0].published).toBe(true);
    expect(body.data.shares[0].includeChildDocuments).toBe(true);
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.update).toBeTruthy();
  });
  it("should not return share for parent document with includeChildDocuments=false", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const childDocument = await buildDocument({
      teamId: document.teamId,
      parentDocumentId: document.id,
      collectionId: collection.id,
    });
    await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
      includeChildDocuments: false,
    });
    await collection.addDocumentToStructure(childDocument, 0);
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        documentId: childDocument.id,
      },
    });
    expect(res.status).toEqual(204);
  });
  it("should return shares for parent document and current document", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const childDocument = await buildDocument({
      teamId: document.teamId,
      parentDocumentId: document.id,
      collectionId: collection.id,
    });
    const share = await buildShare({
      documentId: childDocument.id,
      teamId: user.teamId,
      userId: user.id,
      includeChildDocuments: false,
    });
    const share2 = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
      includeChildDocuments: true,
    });
    await collection.reload();
    await collection.addDocumentToStructure(childDocument, 0);
    const res = await server.post("/api/shares.info", {
      body: {
        token: user.getJwtToken(),
        documentId: childDocument.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.shares.length).toBe(2);
    expect(body.data.shares[0].id).toBe(share.id);
    expect(body.data.shares[0].includeChildDocuments).toBe(false);
    expect(body.data.shares[0].documentId).toBe(childDocument.id);
    expect(body.data.shares[0].published).toBe(true);
    expect(body.data.shares[1].id).toBe(share2.id);
    expect(body.data.shares[1].documentId).toBe(document.id);
    expect(body.data.shares[1].published).toBe(true);
    expect(body.data.shares[1].includeChildDocuments).toBe(true);
  });
});

describe("#shares.update", () => {
  it("should fail for invalid urlId", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
        urlId: "url_id",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "urlId: must contain only alphanumeric and dashes"
    );
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        urlId: "url-id",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Required");
  });

  it("should update urlId", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
        urlId: "url-id",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.urlId).toEqual("url-id");
  });

  it("should allow clearing urlId", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
    });
    await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
        urlId: "url-id",
      },
    });

    const res = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
        urlId: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.urlId).toBeNull();
  });

  it("should allow user to update a share", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
        published: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBe(share.id);
    expect(body.data.published).toBe(true);
  });

  it("should allow author to update a share", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
        published: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBe(share.id);
    expect(body.data.published).toBe(true);
  });

  it("should allow admin to update a share", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ userId: user.id, teamId: team.id });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.update", {
      body: {
        token: admin.getJwtToken(),
        id: share.id,
        published: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBe(share.id);
    expect(body.data.published).toBe(true);
  });

  it("should require authentication", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.update", {
      body: {
        id: share.id,
        published: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id });
    const user = await buildUser();
    const share = await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: admin.id,
    });
    const res = await server.post("/api/shares.update", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
        published: true,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#shares.revoke", () => {
  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/shares.revoke", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Required");
  });

  it("should allow author to revoke a share", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.revoke", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should 404 if shares document is deleted", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await document.delete(user);
    const res = await server.post("/api/shares.revoke", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
      },
    });
    expect(res.status).toEqual(404);
  });

  it("should allow admin to revoke a share", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ userId: user.id, teamId: team.id });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.revoke", {
      body: {
        token: admin.getJwtToken(),
        id: share.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.revoke", {
      body: {
        id: share.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id });
    const user = await buildUser();
    const share = await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: admin.id,
    });
    const res = await server.post("/api/shares.revoke", {
      body: {
        token: user.getJwtToken(),
        id: share.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});
