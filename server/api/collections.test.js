/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import { Collection, CollectionUser, CollectionGroup } from "../models";
import { buildUser, buildGroup, buildCollection } from "../test/factories";
import { flushdb, seed } from "../test/support";
const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#collections.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.list");
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return collections", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/collections.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toEqual(true);
  });

  it("should not return private collections actor is not a member of", async () => {
    const { user, collection } = await seed();
    await buildCollection({
      private: true,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should return private collections actor is a member of", async () => {
    const user = await buildUser();
    await buildCollection({
      private: true,
      teamId: user.teamId,
      userId: user.id,
    });
    await buildCollection({
      private: true,
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/collections.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toEqual(true);
  });

  it("should return private collections actor is a group-member of", async () => {
    const user = await buildUser();
    await buildCollection({
      private: true,
      teamId: user.teamId,
      userId: user.id,
    });

    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });

    const group = await buildGroup({ teamId: user.teamId });
    await group.addUser(user, { through: { createdById: user.id } });

    await collection.addGroup(group, {
      through: { permission: "read", createdById: user.id },
    });

    const res = await server.post("/api/collections.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toEqual(true);
  });
});

describe("#collections.export", () => {
  it("should now allow export of private collection not a member", async () => {
    const { user } = await seed();
    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.export", {
      body: { token: user.getJwtToken(), id: collection.id },
    });

    expect(res.status).toEqual(403);
  });

  it("should allow export of private collection when the actor is a member", async () => {
    const { user, collection } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });

    const res = await server.post("/api/collections.export", {
      body: { token: user.getJwtToken(), id: collection.id },
    });

    expect(res.status).toEqual(200);
  });

  it("should allow export of private collection when the actor is a group member", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });

    const group = await buildGroup({ teamId: user.teamId });
    await group.addUser(user, { through: { createdById: user.id } });

    await collection.addGroup(group, {
      through: { permission: "read", createdById: user.id },
    });

    const res = await server.post("/api/collections.export", {
      body: { token: user.getJwtToken(), id: collection.id },
    });

    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.export");
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return success", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/collections.export", {
      body: { token: user.getJwtToken(), id: collection.id },
    });

    expect(res.status).toEqual(200);
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
      body: { token: user.getJwtToken() },
    });
    expect(res.status).toEqual(403);
  });

  it("should return success", async () => {
    const { admin } = await seed();
    const res = await server.post("/api/collections.export_all", {
      body: { token: admin.getJwtToken() },
    });

    expect(res.status).toEqual(200);
  });

  it("should allow downloading directly", async () => {
    const { admin } = await seed();
    const res = await server.post("/api/collections.export_all", {
      body: { token: admin.getJwtToken(), download: true },
    });

    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toEqual(
      "application/force-download"
    );
  });
});

describe("#collections.add_user", () => {
  it("should add user to collection", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      private: true,
    });
    const anotherUser = await buildUser({ teamId: user.teamId });
    const res = await server.post("/api/collections.add_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });

    const users = await collection.getUsers();
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(2);
  });

  it("should require user in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      private: true,
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
    const { collection } = await seed();
    const user = await buildUser();
    const anotherUser = await buildUser({ teamId: user.teamId });

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
    const user = await buildUser({ isAdmin: true });
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      private: true,
    });
    const group = await buildGroup({ teamId: user.teamId });
    const res = await server.post("/api/collections.add_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });

    const groups = await collection.getGroups();
    expect(groups.length).toEqual(1);
    expect(res.status).toEqual(200);
  });

  it("should require group in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      private: true,
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
    const group = await buildGroup({ teamId: user.teamId });
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
    const user = await buildUser({ isAdmin: true });
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      private: true,
    });
    const group = await buildGroup({ teamId: user.teamId });

    await server.post("/api/collections.add_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });

    let users = await collection.getGroups();
    expect(users.length).toEqual(1);

    const res = await server.post("/api/collections.remove_group", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        groupId: group.id,
      },
    });

    users = await collection.getGroups();
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(0);
  });

  it("should require group in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      private: true,
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
    const { collection } = await seed();
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });

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
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      private: true,
    });
    const anotherUser = await buildUser({ teamId: user.teamId });

    await server.post("/api/collections.add_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });

    const res = await server.post("/api/collections.remove_user", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        userId: anotherUser.id,
      },
    });

    const users = await collection.getUsers();
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(1);
  });

  it("should require user in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      private: true,
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
    const { collection } = await seed();
    const user = await buildUser();
    const anotherUser = await buildUser({ teamId: user.teamId });

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

describe("#collections.users", () => {
  it("should return users in private collection", async () => {
    const { collection, user } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });

    const res = await server.post("/api/collections.users", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.users");
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { collection } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/collections.users", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.group_memberships", () => {
  it("should return groups in private collection", async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });
    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });

    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });

    await CollectionGroup.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: "read_write",
    });

    const res = await server.post("/api/collections.group_memberships", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
    expect(body.data.collectionGroupMemberships.length).toEqual(1);
    expect(body.data.collectionGroupMemberships[0].permission).toEqual(
      "read_write"
    );
  });

  it("should allow filtering groups in collection by name", async () => {
    const user = await buildUser();
    const group = await buildGroup({ name: "will find", teamId: user.teamId });
    const group2 = await buildGroup({ name: "wont find", teamId: user.teamId });
    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });

    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });

    await CollectionGroup.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: "read_write",
    });

    await CollectionGroup.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group2.id,
      permission: "read_write",
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
    const group = await buildGroup({ teamId: user.teamId });
    const group2 = await buildGroup({ teamId: user.teamId });
    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });

    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });

    await CollectionGroup.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: "read_write",
    });

    await CollectionGroup.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group2.id,
      permission: "maintainer",
    });

    const res = await server.post("/api/collections.group_memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        permission: "maintainer",
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
      private: true,
      teamId: user.teamId,
    });

    const res = await server.post("/api/collections.group_memberships", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.memberships", () => {
  it("should return members in private collection", async () => {
    const { collection, user } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });

    const res = await server.post("/api/collections.memberships", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
    expect(body.data.memberships.length).toEqual(1);
    expect(body.data.memberships[0].permission).toEqual("read_write");
  });

  it("should allow filtering members in collection by name", async () => {
    const { collection, user } = await seed();
    const user2 = await buildUser({ name: "Won't find" });
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });
    await CollectionUser.create({
      createdById: user2.id,
      collectionId: collection.id,
      userId: user2.id,
      permission: "read_write",
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
    const { collection, user } = await seed();
    const user2 = await buildUser();
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });
    await CollectionUser.create({
      createdById: user2.id,
      collectionId: collection.id,
      userId: user2.id,
      permission: "maintainer",
    });

    const res = await server.post("/api/collections.memberships", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        permission: "maintainer",
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
    const { collection } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/collections.memberships", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.info", () => {
  it("should return collection", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/collections.info", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
  });

  it("should require user member of collection", async () => {
    const { user, collection } = await seed();
    collection.private = true;
    await collection.save();

    const res = await server.post("/api/collections.info", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow user member of collection", async () => {
    const { user, collection } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: user.id,
      permission: "read",
    });

    const res = await server.post("/api/collections.info", {
      body: { token: user.getJwtToken(), id: collection.id },
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
    const { collection } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/collections.info", {
      body: { token: user.getJwtToken(), id: collection.id },
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
    const { user } = await seed();
    const res = await server.post("/api/collections.create", {
      body: { token: user.getJwtToken(), name: "Test" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe("Test");
    expect(body.data.sort.field).toBe("index");
    expect(body.data.sort.direction).toBe("asc");
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.export).toBeTruthy();
  });

  it("should return correct policies with private collection", async () => {
    const { user } = await seed();
    const res = await server.post("/api/collections.create", {
      body: { token: user.getJwtToken(), name: "Test", private: true },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.private).toBeTruthy();
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.export).toBeTruthy();
  });
});

describe("#collections.update", () => {
  it("should require authentication", async () => {
    const collection = await buildCollection();
    const res = await server.post("/api/collections.update", {
      body: { id: collection.id, name: "Test" },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { collection } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, name: "Test" },
    });
    expect(res.status).toEqual(403);
  });

  it("allows editing non-private collection", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, name: "Test" },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("allows editing sort", async () => {
    const { user, collection } = await seed();
    const sort = { field: "index", direction: "desc" };
    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, sort },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.sort.field).toBe("index");
    expect(body.data.sort.direction).toBe("desc");
  });

  it("allows editing individual fields", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, private: true },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.private).toBe(true);
    expect(body.data.name).toBe(collection.name);
  });

  it("allows editing from non-private to private collection", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/collections.update", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        private: true,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.data.private).toBe(true);

    // ensure we return with a write level policy
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.update).toBe(true);
  });

  it("allows editing from private to non-private collection", async () => {
    const { user, collection } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: user.id,
      permission: "read_write",
    });

    const res = await server.post("/api/collections.update", {
      body: {
        token: user.getJwtToken(),
        id: collection.id,
        private: false,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.data.private).toBe(false);

    // ensure we return with a write level policy
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.update).toBe(true);
  });

  it("allows editing by read-write collection user", async () => {
    const { user, collection } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: user.id,
      permission: "read_write",
    });

    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, name: "Test" },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("allows editing by read-write collection group user", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });

    const group = await buildGroup({ teamId: user.teamId });
    await group.addUser(user, { through: { createdById: user.id } });

    await collection.addGroup(group, {
      through: { permission: "read_write", createdById: user.id },
    });

    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, name: "Test" },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("does not allow editing by read-only collection user", async () => {
    const { user, collection } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: user.id,
      permission: "read",
    });

    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, name: "Test" },
    });
    expect(res.status).toEqual(403);
  });

  it("does not allow setting unknown sort fields", async () => {
    const { user, collection } = await seed();
    const sort = { field: "blah", direction: "desc" };
    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, sort },
    });
    expect(res.status).toEqual(400);
  });

  it("does not allow setting unknown sort directions", async () => {
    const { user, collection } = await seed();
    const sort = { field: "title", direction: "blah" };
    const res = await server.post("/api/collections.update", {
      body: { token: user.getJwtToken(), id: collection.id, sort },
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
    const { collection } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/collections.delete", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow deleting last collection", async () => {
    const { user, collection } = await seed();
    const res = await server.post("/api/collections.delete", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(400);
  });

  it("should delete collection", async () => {
    const { user, collection } = await seed();
    await Collection.create({
      name: "Blah",
      urlId: "blah",
      teamId: user.teamId,
      creatorId: user.id,
    });

    const res = await server.post("/api/collections.delete", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });

  it("allows deleting by read-write collection group user", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      private: true,
      teamId: user.teamId,
    });
    await buildCollection({
      teamId: user.teamId,
    });

    const group = await buildGroup({ teamId: user.teamId });
    await group.addUser(user, { through: { createdById: user.id } });

    await collection.addGroup(group, {
      through: { permission: "read_write", createdById: user.id },
    });

    const res = await server.post("/api/collections.delete", {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });
});
