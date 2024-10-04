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
    await server.post("/api/documents.add_user", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        userId: member.id,
      },
    });
    const users = await document.$get("users");
    expect(users.length).toEqual(1);
    const res = await server.post("/api/userMemberships.list", {
      body: {
        token: member.getJwtToken(),
      },
    });
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
    const resp = await server.post("/api/documents.add_user", {
      body: {
        token: user.getJwtToken(),
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
    const res = await server.post("/api/userMemberships.update", {
      body: {
        token: member.getJwtToken(),
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
