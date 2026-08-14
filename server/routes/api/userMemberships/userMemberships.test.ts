import {
  buildCollection,
  buildDocument,
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

describe("#userMemberships.list - section filter", () => {
  const buildSharedAndPrivateMemberships = async () => {
    const user = await buildUser();

    // a private document created by the user
    const createRes = await server.post("/api/documents.create", user, {
      body: {
        title: "Private notes",
        private: true,
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

    return { user, privateDocumentId: createBody.data.id, shared };
  };

  it("should return only private documents for the private section", async () => {
    const { user, privateDocumentId } =
      await buildSharedAndPrivateMemberships();

    const res = await server.post("/api/userMemberships.list", user, {
      body: { section: "private" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(privateDocumentId);
  });

  it("should return only shared documents for the shared section", async () => {
    const { user, shared } = await buildSharedAndPrivateMemberships();

    const res = await server.post("/api/userMemberships.list", user, {
      body: { section: "shared" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(shared.id);
  });

  it("should return all memberships without a section filter", async () => {
    const { user } = await buildSharedAndPrivateMemberships();

    const res = await server.post("/api/userMemberships.list", user, {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(2);
  });
});

describe("#userMemberships.list - nested private documents", () => {
  it("should not return nested private documents as roots of the private section", async () => {
    const user = await buildUser();

    const parentRes = await server.post("/api/documents.create", user, {
      body: {
        title: "Parent",
        private: true,
        publish: true,
      },
    });
    const parentBody = await parentRes.json();
    const childRes = await server.post("/api/documents.create", user, {
      body: {
        title: "Child",
        private: true,
        publish: true,
      },
    });
    const childBody = await childRes.json();

    const moveRes = await server.post("/api/documents.move", user, {
      body: {
        id: childBody.data.id,
        parentDocumentId: parentBody.data.id,
      },
    });
    expect(moveRes.status).toEqual(200);

    const res = await server.post("/api/userMemberships.list", user, {
      body: { section: "private" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.memberships[0].documentId).toEqual(parentBody.data.id);
  });
});
