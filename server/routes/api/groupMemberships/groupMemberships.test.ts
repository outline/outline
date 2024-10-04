import { GroupUser } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildGroup,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("groupMemberships.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/groupMemberships.list", {
      body: {},
    });
    expect(res.status).toEqual(401);
  });

  it("should return the list of docs shared with group", async () => {
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
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const member = await buildUser({
      teamId: user.teamId,
    });
    await GroupUser.create({
      groupId: group.id,
      userId: member.id,
      createdById: user.id,
    });

    await server.post("/api/documents.add_group", {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        groupId: group.id,
      },
    });

    const res = await server.post("/api/groupMemberships.list", {
      body: {
        token: member.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).not.toBeFalsy();
    expect(body.data.documents).not.toBeFalsy();
    expect(body.data.documents).toHaveLength(1);
    expect(body.data.groupMemberships).not.toBeFalsy();
    expect(body.data.groupMemberships).toHaveLength(1);
    const sharedDoc = body.data.documents[0];
    expect(sharedDoc.id).toEqual(document.id);
    expect(sharedDoc.id).toEqual(body.data.groupMemberships[0].documentId);
    expect(body.data.groupMemberships[0].groupId).toEqual(group.id);
    expect(body.policies).not.toBeFalsy();
  });
});
