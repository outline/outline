import { DocumentPermission } from "@shared/types";
import { UserMembership } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildPersonalDocument,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#userMemberships.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/userMemberships.list", {
      body: {},
    });
    expect(res.status).toEqual(401);
  });

  it("should return the list of docs shared with user", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: user.id,
      permission: null,
    });
    const document = await buildDocument({
      collectionId: collection.id,
      createdById: user.id,
      teamId: user.teamId,
    });
    const member = await buildUser({
      teamId: user.teamId,
    });
    await server.post("/api/documents.add_user", user, {
      body: {
        id: document.id,
        userId: member.id,
      },
    });
    const users = await document.$get("users");
    expect(users.length).toEqual(1);
    const res = await server.post("/api/userMemberships.list", member);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).not.toBeFalsy();
    expect(body.data.documents).not.toBeFalsy();
    expect(body.data.documents).toHaveLength(1);
    expect(body.data.memberships).not.toBeFalsy();
    expect(body.data.memberships).toHaveLength(1);
    const sharedDoc = body.data.documents[0];
    expect(sharedDoc.id).toEqual(document.id);
    expect(sharedDoc.id).toEqual(body.data.memberships[0].documentId);
    expect(body.data.memberships[0].userId).toEqual(member.id);
    expect(body.data.memberships[0].index).not.toBeFalsy();
    expect(body.policies).not.toBeFalsy();
    expect(body.policies).toHaveLength(2);
    expect(body.policies[1].abilities).not.toBeFalsy();
    expect(body.policies[1].abilities.update).toBeTruthy();
  });

  it("should not return memberships for deleted or archived documents", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: user.id,
      permission: null,
    });
    const member = await buildUser({
      teamId: user.teamId,
    });

    const documents = await Promise.all(
      [0, 1, 2].map(() =>
        buildDocument({
          collectionId: collection.id,
          createdById: user.id,
          teamId: user.teamId,
        })
      )
    );

    for (const document of documents) {
      await server.post("/api/documents.add_user", user, {
        body: {
          id: document.id,
          userId: member.id,
        },
      });
    }

    await server.post("/api/documents.delete", user, {
      body: { id: documents[0].id },
    });
    await server.post("/api/documents.archive", user, {
      body: { id: documents[1].id },
    });

    const res = await server.post("/api/userMemberships.list", member);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(documents[2].id);
    expect(body.data.documents).toHaveLength(1);
    expect(body.data.documents[0].id).toEqual(documents[2].id);
  });
});

describe("#userMemberships.update", () => {
  it("should update the index", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: user.id,
      permission: null,
    });
    const document = await buildDocument({
      collectionId: collection.id,
      createdById: user.id,
      teamId: user.teamId,
    });
    const member = await buildUser({
      teamId: user.teamId,
    });
    const resp = await server.post("/api/documents.add_user", user, {
      body: {
        id: document.id,
        userId: member.id,
      },
    });
    const respBody = await resp.json();
    expect(respBody.data).not.toBeFalsy();
    expect(respBody.data.memberships).not.toBeFalsy();
    expect(respBody.data.memberships).toHaveLength(1);

    const users = await document.$get("users");
    expect(users.length).toEqual(1);
    const res = await server.post("/api/userMemberships.update", member, {
      body: {
        id: respBody.data.memberships[0].id,
        index: "V",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).not.toBeFalsy();
    expect(body.data.documentId).toEqual(document.id);
    expect(body.data.userId).toEqual(member.id);
    expect(body.data.index).toEqual("V");
  });
});

describe("#userMemberships.list - personal documents", () => {
  const buildSharedAndPersonalDocuments = async () => {
    const user = await buildUser();

    // a personal document created by the user
    const createRes = await server.post("/api/documents.create", user, {
      body: {
        title: "Personal notes",
        personalOwnerId: user.id,
        publish: true,
      },
    });
    const createBody = await createRes.json();

    // a document shared with the user by somebody else
    const other = await buildUser({ teamId: user.teamId });
    const collection = await buildCollection({
      teamId: other.teamId,
      createdById: other.id,
      permission: null,
    });
    const shared = await buildDocument({
      collectionId: collection.id,
      createdById: other.id,
      teamId: other.teamId,
    });
    await server.post("/api/documents.add_user", other, {
      body: {
        id: shared.id,
        userId: user.id,
      },
    });

    return { user, personalDocumentId: createBody.data.id, shared };
  };

  it("should omit the user's own personal documents from the shared list", async () => {
    const { user, shared } = await buildSharedAndPersonalDocuments();

    const res = await server.post("/api/userMemberships.list", user, {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(shared.id);
  });

  it("should return a personal document belonging to another user that was shared", async () => {
    const owner = await buildUser();
    const user = await buildUser({ teamId: owner.teamId });
    const document = await buildPersonalDocument({
      teamId: owner.teamId,
      userId: owner.id,
    });

    await server.post("/api/documents.add_user", owner, {
      body: {
        id: document.id,
        userId: user.id,
      },
    });

    const res = await server.post("/api/userMemberships.list", user, {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(document.id);
  });
});

describe("userMemberships - unfiled drafts", () => {
  it("should return a draft without a collection shared by another user", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const draft = await buildDraftDocument({
      teamId: other.teamId,
      userId: other.id,
      collectionId: null,
    });

    const addRes = await server.post("/api/documents.add_user", other, {
      body: {
        id: draft.id,
        userId: user.id,
      },
    });
    expect(addRes.status).toEqual(200);

    const res = await server.post("/api/userMemberships.list", user, {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(draft.id);
  });

  it("should return the user's own unfiled draft, which is not personal", async () => {
    const user = await buildUser();
    const draft = await buildDraftDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: null,
    });
    await UserMembership.create({
      userId: user.id,
      documentId: draft.id,
      permission: DocumentPermission.Admin,
      index: "a",
      createdById: user.id,
    });

    const res = await server.post("/api/userMemberships.list", user, {
      body: {},
    });
    const body = await res.json();

    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(draft.id);
  });
});
