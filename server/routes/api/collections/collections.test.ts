import { CollectionPermission, CollectionStatusFilter } from "@shared/types";
import { Document, UserMembership, GroupMembership } from "@server/models";
import {
  buildUser,
  buildAdmin,
  buildGroup,
  buildCollection,
  buildDocument,
  buildTeam,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#collections.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const res = await server.post("/api/collections.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should include archived collections", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", {
      body: {
        token: admin.getJwtToken(),
        statusFilter: [CollectionStatusFilter.Archived],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].archivedAt).toBeTruthy();
    expect(body.data[0].archivedBy).toBeTruthy();
    expect(body.data[0].archivedBy.id).toBe(collection.archivedById);
  });

  it("should exclude archived collections", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    await buildCollection({
      teamId: team.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(0);
  });

  it("should not return private collections actor is not a member of", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should return private collections actor is a member of", async () => {
    const user = await buildUser();
    await buildCollection({
      permission: null,
      teamId: user.teamId,
      userId: user.id,
    });
    await buildCollection({
      permission: null,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/collections.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should return private collections actor is a group-member of", async () => {
    const user = await buildUser();
    await buildCollection({
      permission: null,
      teamId: user.teamId,
      userId: user.id,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.Read,
        createdById: user.id,
      },
    });
    const res = await server.post("/api/collections.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should not include archived collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildCollection({
      userId: user.id,
      teamId: team.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not include archived collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });

    const beforeArchiveRes = await server.post("/api/collections.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const beforeArchiveBody = await beforeArchiveRes.json();
    expect(beforeArchiveRes.status).toEqual(200);
    expect(beforeArchiveBody.data).toHaveLength(1);
    expect(beforeArchiveBody.data[0].id).toEqual(collection.id);

    const archiveRes = await server.post("/api/collections.archive", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });

    expect(archiveRes.status).toEqual(200);

    const afterArchiveRes = await server.post("/api/collections.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const afterArchiveBody = await afterArchiveRes.json();
    expect(afterArchiveRes.status).toEqual(200);
    expect(afterArchiveBody.data).toHaveLength(0);
  });
});

describe("#collections.import", () => {
  it("should error if no attachmentId is passed", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.import", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.import");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#collections.move", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.move");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const collection = await buildCollection();
    const res = await server.post("/api/collections.move", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        index: "P",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return success", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        index: "P",
        icon: "flame",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });

  it("should allow setting an emoji as icon", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        index: "P",
        icon: "😁",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });

  it("should return error when icon is not valid", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        icon: "nonsRence",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should return error when index is not valid", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        index: "يونيكود",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("if index collision occurs, should updated index of other collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const createdCollectionResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "Test",
          sharing: false,
          index: "Q",
        },
      }
    );
    await createdCollectionResponse.json();
    const movedCollectionRes = await server.post("/api/collections.move", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        index: "Q",
      },
    });
    const movedCollection = await movedCollectionRes.json();
    expect(movedCollectionRes.status).toEqual(200);
    expect(movedCollection.success).toBe(true);
    expect(movedCollection.data.index).toEqual("h");
    expect(movedCollection.data.index > "Q").toBeTruthy();
  });

  it("if index collision with an extra collection, should updated index of other collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const createdCollectionAResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "A",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollectionBResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "B",
          sharing: false,
          index: "b",
        },
      }
    );
    const createdCollectionCResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "C",
          sharing: false,
          index: "c",
        },
      }
    );
    await createdCollectionAResponse.json();
    await createdCollectionBResponse.json();
    const createdCollectionC = await createdCollectionCResponse.json();
    const movedCollectionCResponse = await server.post(
      "/api/collections.move",
      {
        body: {
          token: admin.getJwtToken(),
          id: createdCollectionC.data.id,
          index: "a",
        },
      }
    );
    const movedCollectionC = await movedCollectionCResponse.json();
    expect(movedCollectionCResponse.status).toEqual(200);
    expect(movedCollectionC.success).toBe(true);
    expect(movedCollectionC.data.index).toEqual("aP");
    expect(movedCollectionC.data.index > "a").toBeTruthy();
    expect(movedCollectionC.data.index < "b").toBeTruthy();
  });
});

describe("#collections.export", () => {
  it("should not allow export of private collection not a member", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.export", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow export of private collection when the actor is a member", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      createdById: admin.id,
      collectionId: collection.id,
      userId: admin.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.export", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should allow export of private collection when the actor is a group member", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      permission: null,
      teamId: admin.teamId,
    });
    const group = await buildGroup({
      teamId: admin.teamId,
    });
    await group.$add("user", admin, {
      through: {
        createdById: admin.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.ReadWrite,
        createdById: admin.id,
      },
    });
    const res = await server.post("/api/collections.export", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.export");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return unauthorized if user is not admin", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const res = await server.post("/api/collections.export", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return file operation associated with export", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/collections.export", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.fileOperation.id).toBeTruthy();
    expect(body.data.fileOperation.state).toBe("creating");
  });
});

describe("#collections.export_all", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.export_all");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.export_all", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return success", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/collections.export_all", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    expect(res.status).toEqual(200);
  });
});

describe("#collections.add_user", () => {
  it("should add user to collection", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
      permission: null,
    });
    const anotherUser = await buildUser({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/collections.add_user", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const users = await collection.$get("users");
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(2);
  });

  it("should not allow add self", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const res = await server.post("/api/collections.add_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: user.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require user in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const anotherUser = await buildUser();
    const res = await server.post("/api/collections.add_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.add_user");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.add_group", () => {
  it("should add group to collection", async () => {
    const user = await buildAdmin();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });
    const groups = await collection.$get("groups");
    expect(groups.length).toEqual(1);
    expect(res.status).toEqual(200);
  });

  it("should fail with status 400 bad request when permission is null", async () => {
    const user = await buildAdmin();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
        permission: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "permission: Expected 'read' | 'read_write' | 'admin', received null"
    );
  });

  it("should require group in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup();
    const res = await server.post("/api/collections.add_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.add_group");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.remove_group", () => {
  it("should remove group from collection", async () => {
    const user = await buildAdmin();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await server.post("/api/collections.add_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });
    let groups = await collection.$get("groups");
    expect(groups.length).toEqual(1);
    const res = await server.post("/api/collections.remove_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });
    groups = await collection.$get("groups");
    expect(res.status).toEqual(200);
    expect(groups.length).toEqual(0);
  });

  it("should require group in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const group = await buildGroup();
    const res = await server.post("/api/collections.remove_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.remove_group");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.remove_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.remove_user", () => {
  it("should remove user from collection", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
      permission: null,
    });
    const anotherUser = await buildUser({
      teamId: admin.teamId,
    });
    await server.post("/api/collections.add_user", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const res = await server.post("/api/collections.remove_user", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const users = await collection.$get("users");
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(1);
  });

  it("should fail with status 400 bad request if user is not a member", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
      permission: null,
    });
    const nonMember = await buildUser({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/collections.remove_user", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        userId: nonMember.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("User is not a collection member");
  });

  it("should require user in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const anotherUser = await buildUser();
    const res = await server.post("/api/collections.remove_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.remove_user");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.remove_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.group_memberships", () => {
  it("should return groups in private collection", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.group_memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    const [membership] = await collection.$get("groupMemberships");
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
    expect(body.data.groupMemberships.length).toEqual(1);
    expect(body.data.groupMemberships[0].id).toEqual(membership.id);
    expect(body.data.groupMemberships[0].permission).toEqual(
      CollectionPermission.ReadWrite
    );
  });

  it("should allow filtering groups in collection by name", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      name: "will find",
      teamId: user.teamId,
    });
    const group2 = await buildGroup({
      name: "wont find",
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group2.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.group_memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        query: "will",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
  });

  it("should allow filtering groups in collection by permission", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const group2 = await buildGroup({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group2.id,
      permission: CollectionPermission.Read,
    });
    const res = await server.post("/api/collections.group_memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        permission: CollectionPermission.Read,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group2.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.group_memberships");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.group_memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.memberships", () => {
  it("should return members in private collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();

    const res = await server.post("/api/collections.memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    const [membership] = await collection.$get("memberships");
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
    expect(body.data.memberships.length).toEqual(1);
    expect(body.data.memberships[0].id).toEqual(membership.id);
    expect(body.data.memberships[0].permission).toEqual(
      CollectionPermission.Admin
    );
  });

  it("should allow filtering members in collection by name", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const user2 = await buildUser({
      name: "Won't find",
    });
    await UserMembership.create({
      createdById: user2.id,
      collectionId: collection.id,
      userId: user2.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        query: user.name.slice(0, 3),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
  });

  it("should allow filtering members in collection by permission", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const user2 = await buildUser();
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await UserMembership.create({
      createdById: user2.id,
      collectionId: collection.id,
      userId: user2.id,
      permission: CollectionPermission.Read,
    });
    const res = await server.post("/api/collections.memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        permission: CollectionPermission.Read,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user2.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.memberships");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.info", () => {
  it("should return archivedBy for archived collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
      archivedAt: new Date(),
      archivedById: user.id,
    });
    const res = await server.post("/api/collections.info", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.archivedBy.id).toEqual(collection.archivedById);
  });

  it("should return collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const res = await server.post("/api/collections.info", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
  });

  it("should require user member of collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.destroy({
      where: {
        collectionId: collection.id,
        userId: user.id,
      },
    });
    const res = await server.post("/api/collections.info", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow user member of collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: user.id,
      permission: CollectionPermission.Read,
    });
    const res = await server.post("/api/collections.info", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.info");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.info", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.create", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.create");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should create collection", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", {
      body: {
        token: user.getJwtToken(),
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe("Test");
    expect(body.data.sort.field).toBe("index");
    expect(body.data.sort.direction).toBe("asc");
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should error when index is invalid", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", {
      body: {
        token: user.getJwtToken(),
        name: "Test",
        index: "يونيكود",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should allow setting sharing to false", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", {
      body: {
        token: user.getJwtToken(),
        name: "Test",
        sharing: false,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeTruthy();
    expect(body.data.sharing).toBe(false);
  });

  it("should return correct policies with private collection", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", {
      body: {
        token: user.getJwtToken(),
        name: "Test",
        permission: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.permission).toEqual(null);
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("if index collision, should updated index of other collection", async () => {
    const user = await buildUser();
    const createdCollectionAResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "A",
          sharing: false,
          index: "a",
        },
      }
    );
    await createdCollectionAResponse.json();
    const createCollectionResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "C",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollection = await createCollectionResponse.json();
    expect(createCollectionResponse.status).toEqual(200);
    expect(createdCollection.data.index).toEqual("p");
    expect(createdCollection.data.index > "a").toBeTruthy();
  });

  it("if index collision with an extra collection, should updated index of other collection", async () => {
    const user = await buildUser();
    const createdCollectionAResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "A",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollectionBResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "B",
          sharing: false,
          index: "b",
        },
      }
    );
    await createdCollectionAResponse.json();
    await createdCollectionBResponse.json();
    const createCollectionResponse = await server.post(
      "/api/collections.create",
      {
        body: {
          token: user.getJwtToken(),
          name: "C",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollection = await createCollectionResponse.json();
    expect(createCollectionResponse.status).toEqual(200);
    expect(createdCollection.data.index).toEqual("aP");
    expect(createdCollection.data.index > "a").toBeTruthy();
    expect(createdCollection.data.index < "b").toBeTruthy();
  });
});

describe("#collections.update", () => {
  it("should require authentication", async () => {
    const collection = await buildCollection();
    const res = await server.post("/api/collections.update", {
      body: {
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.update", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        name: "Test",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("allows editing non-private collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("allows editing description", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        description: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.description).toBe("Test");

    await collection.reload();

    expect(collection.description).toBe("Test");
    expect(collection.content).toBeTruthy();
  });

  it("allows editing data", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        data: {
          content: [
            { content: [{ text: "Test", type: "text" }], type: "paragraph" },
          ],
          type: "doc",
        },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.description).toBe("Test");
  });

  it("allows editing sort", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const sort = {
      field: "index",
      direction: "desc",
    };
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        sort,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.sort.field).toBe("index");
    expect(body.data.sort.direction).toBe("desc");
  });

  it("allows editing individual fields", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        permission: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.permission).toBe(null);
    expect(body.data.name).toBe(collection.name);
  });

  it("allows editing from non-private to private collection, and trims whitespace", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        permission: null,
        name: "  Test  ",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.data.permission).toBe(null);
    // ensure we return with a write level policy
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.update).toBeTruthy();
  });

  it("allows editing from private to non-private collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      collectionId: collection.id,
      userId: admin.id,
      createdById: admin.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        permission: CollectionPermission.ReadWrite,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.data.permission).toBe(CollectionPermission.ReadWrite);
    // ensure we return with a write level policy
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.update).toBeTruthy();
  });

  it("allows editing by read-write collection user", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      collectionId: collection.id,
      userId: admin.id,
      createdById: admin.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("allows editing by admin collection group user", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.Admin,
        createdById: user.id,
      },
    });
    const res = await server.post("/api/collections.update", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("does not allow editing by read-only collection user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.update(
      {
        createdById: user.id,
        permission: CollectionPermission.Read,
      },
      {
        where: {
          collectionId: collection.id,
          userId: user.id,
        },
      }
    );
    const res = await server.post("/api/collections.update", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        name: "Test",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("does not allow setting unknown sort fields", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const sort = {
      field: "blah",
      direction: "desc",
    };
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        sort,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("does not allow setting unknown sort directions", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const sort = {
      field: "title",
      direction: "blah",
    };
    const res = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        sort,
      },
    });
    expect(res.status).toEqual(400);
  });
});

describe("#collections.delete", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.delete");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.delete", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow deleting last collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.delete", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should delete collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    await buildCollection({ teamId: team.id });

    const res = await server.post("/api/collections.delete", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });

  it("should delete published documents", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    // to ensure it isn't the last collection
    await buildCollection({
      teamId: admin.teamId,
      createdById: admin.id,
    });
    // archived document should not be deleted
    await buildDocument({
      collectionId: collection.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.delete", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
    expect(
      await Document.count({
        where: {
          collectionId: collection.id,
        },
      })
    ).toEqual(1);
  });

  it("allows deleting by admin collection group user", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await buildCollection({
      teamId: user.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.Admin,
        createdById: user.id,
      },
    });
    const res = await server.post("/api/collections.delete", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });
});

describe("#collections.archive", () => {
  it("should archive collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const document = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      publishedAt: new Date(),
    });

    await collection.reload();
    expect(collection.documentStructure).not.toBe(null);
    expect(document.archivedAt).toBe(null);
    const res = await server.post("/api/collections.archive", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    const [, , body] = await Promise.all([
      collection.reload(),
      document.reload(),
      res.json(),
    ]);
    expect(res.status).toEqual(200);
    expect(body.data.archivedAt).not.toBe(null);
    expect(body.data.archivedBy).toBeTruthy();
    expect(body.data.archivedBy.id).toBe(collection.archivedById);
    expect(document.archivedAt).not.toBe(null);
  });
});

describe("#collections.restore", () => {
  it("should restore collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
    });
    await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      publishedAt: new Date(),
    });
    // reload to ensure documentStructure is set
    await collection.reload();
    expect(collection.documentStructure).not.toBe(null);
    const archiveRes = await server.post("/api/collections.archive", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    const [, archiveBody] = await Promise.all([
      collection.reload(),
      archiveRes.json(),
    ]);
    expect(archiveRes.status).toEqual(200);
    expect(archiveBody.data.archivedAt).not.toBe(null);
    const res = await server.post("/api/collections.restore", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    const [, body] = await Promise.all([collection.reload(), res.json()]);
    expect(res.status).toEqual(200);
    expect(body.data.archivedAt).toBe(null);
    expect(collection.documentStructure).not.toBe(null);
  });
});
