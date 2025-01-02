import { Event, Group, User } from "@server/models";
import { buildUser, buildAdmin, buildGroup } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#groups.create", () => {
  it("should create a group", async () => {
    const name = "hello I am a group";
    const user = await buildAdmin();
    const res = await server.post("/api/groups.create", {
      body: {
        token: user.getJwtToken(),
        name,
        externalId: "123",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(name);
    expect(body.data.externalId).toEqual("123");
  });
});

describe("#groups.update", () => {
  it("should require authentication", async () => {
    const group = await buildGroup();
    const res = await server.post("/api/groups.update", {
      body: {
        id: group.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const group = await buildGroup();
    const user = await buildUser();
    const res = await server.post("/api/groups.update", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        name: "Test",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authorization", async () => {
    const group = await buildGroup();
    const user = await buildAdmin();
    const res = await server.post("/api/groups.update", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        name: "Test",
      },
    });
    expect(res.status).toEqual(403);
  });
  describe("when user is admin", () => {
    let user: User, group: Group;
    beforeEach(async () => {
      user = await buildAdmin();
      group = await buildGroup({
        teamId: user.teamId,
      });
    });

    it("allows admin to edit a group", async () => {
      const res = await server.post("/api/groups.update", {
        body: {
          token: user.getJwtToken(),
          id: group.id,
          name: "Test",
          externalId: "123",
        },
      });
      const events = await Event.findAll({
        where: {
          name: "groups.update",
          teamId: user.teamId,
        },
      });
      expect(events.length).toEqual(1);
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.name).toBe("Test");
      expect(body.data.externalId).toBe("123");
    });

    it("does not create an event if the update is a noop", async () => {
      const res = await server.post("/api/groups.update", {
        body: {
          token: user.getJwtToken(),
          id: group.id,
          name: group.name,
        },
      });
      const events = await Event.findAll({
        where: {
          name: "groups.update",
          teamId: user.teamId,
        },
      });
      expect(events.length).toEqual(0);
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.name).toBe(group.name);
    });

    it("fails with validation error when name already taken", async () => {
      await buildGroup({
        teamId: user.teamId,
        name: "test",
      });
      const res = await server.post("/api/groups.update", {
        body: {
          token: user.getJwtToken(),
          id: group.id,
          name: "TEST",
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(400);
      expect(body).toMatchSnapshot();
    });
  });
});

describe("#groups.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/groups.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return groups with memberships preloaded", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    const res = await server.post("/api/groups.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
    expect(body.data.groupMemberships.length).toEqual(1);
    expect(body.data.groupMemberships[0].groupId).toEqual(group.id);
    expect(body.data.groupMemberships[0].user.id).toEqual(user.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should return groups when membership user is deleted", async () => {
    const me = await buildUser();
    const user = await buildUser({
      teamId: me.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: me.id,
      },
    });
    await group.$add("user", me, {
      through: {
        createdById: me.id,
      },
    });
    await user.destroy();
    const res = await server.post("/api/groups.list", {
      body: {
        token: me.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
    expect(body.data.groupMemberships.length).toEqual(1);
    expect(body.data.groupMemberships[0].groupId).toEqual(group.id);
    expect(body.data.groupMemberships[0].user.id).toEqual(me.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should return groups only to which a given user has been added", async () => {
    const user = await buildUser();
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherGroup = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await group.$add("user", anotherUser, {
      through: {
        createdById: user.id,
      },
    });
    const res = await server.post("/api/groups.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(2);
    expect(body.data.groups[0].id).toEqual(anotherGroup.id);
    expect(body.data.groups[1].id).toEqual(group.id);
    expect(body.data.groupMemberships.length).toEqual(2);
    expect(body.data.groupMemberships[0].groupId).toEqual(group.id);
    expect(body.data.groupMemberships[1].groupId).toEqual(group.id);
    expect(
      body.data.groupMemberships.map((u: any) => u.user.id).includes(user.id)
    ).toBe(true);
    expect(
      body.data.groupMemberships
        .map((u: any) => u.user.id)
        .includes(anotherUser.id)
    ).toBe(true);
    expect(body.policies.length).toEqual(2);

    const anotherRes = await server.post("/api/groups.list", {
      body: {
        userId: user.id,
        token: user.getJwtToken(),
      },
    });
    const anotherBody = await anotherRes.json();
    expect(anotherRes.status).toEqual(200);
    expect(anotherBody.data.groups.length).toEqual(1);
    expect(anotherBody.data.groups[0].id).toEqual(group.id);
    expect(anotherBody.data.groupMemberships.length).toEqual(2);
    expect(anotherBody.data.groupMemberships[0].groupId).toEqual(group.id);
    expect(anotherBody.data.groupMemberships[1].groupId).toEqual(group.id);
    expect(
      body.data.groupMemberships.map((u: any) => u.user.id).includes(user.id)
    ).toBe(true);
    expect(
      body.data.groupMemberships
        .map((u: any) => u.user.id)
        .includes(anotherUser.id)
    ).toBe(true);
  });

  it("should allow to find a group by its name", async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });
    await buildGroup({ teamId: user.teamId });

    const res = await server.post("/api/groups.list", {
      body: {
        name: group.name,
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
  });

  it("should allow to find a group by its externalId", async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId, externalId: "123" });
    await buildGroup({ teamId: user.teamId });

    const res = await server.post("/api/groups.list", {
      body: {
        externalId: "123",
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
  });
});

describe("#groups.info", () => {
  it("should return group if admin", async () => {
    const user = await buildAdmin();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/groups.info", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(group.id);
  });

  it("should return group with externalId", async () => {
    const user = await buildAdmin();
    const group = await buildGroup({
      teamId: user.teamId,
      externalId: "456",
    });
    const res = await server.post("/api/groups.info", {
      body: {
        token: user.getJwtToken(),
        externalId: "456",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(group.id);
  });

  it("should return group if member", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    const res = await server.post("/api/groups.info", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(group.id);
  });

  it("should return group if non-member, non-admin", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/groups.info", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(group.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/groups.info");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const group = await buildGroup();
    const res = await server.post("/api/groups.info", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#groups.delete", () => {
  it("should require authentication", async () => {
    const group = await buildGroup();
    const res = await server.post("/api/groups.delete", {
      body: {
        id: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const group = await buildGroup();
    const user = await buildUser();
    const res = await server.post("/api/groups.delete", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authorization", async () => {
    const group = await buildGroup();
    const user = await buildAdmin();
    const res = await server.post("/api/groups.delete", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("allows admin to delete a group", async () => {
    const user = await buildAdmin();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/groups.delete", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });
});

describe("#groups.memberships", () => {
  it("should return members in a group", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    const res = await server.post("/api/groups.memberships", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
    expect(body.data.groupMemberships.length).toEqual(1);
    expect(body.data.groupMemberships[0].user.id).toEqual(user.id);
  });

  it("should allow filtering members in group by name", async () => {
    const user = await buildUser();
    const user2 = await buildUser({
      name: "Won't find",
    });
    const user3 = await buildUser({
      teamId: user.teamId,
      name: "Deleted",
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await group.$add("user", user2, {
      through: {
        createdById: user.id,
      },
    });
    await group.$add("user", user3, {
      through: {
        createdById: user.id,
      },
    });
    await user3.destroy();
    const res = await server.post("/api/groups.memberships", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        query: user.name.slice(0, 3),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/groups.memberships");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const group = await buildGroup();
    const res = await server.post("/api/groups.memberships", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#groups.add_user", () => {
  it("should add user to group", async () => {
    const user = await buildAdmin();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/groups.add_user", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: user.id,
      },
    });
    const users = await group.$get("users");
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(1);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/groups.add_user");
    expect(res.status).toEqual(401);
  });

  it("should require user in team", async () => {
    const user = await buildAdmin();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser();
    const res = await server.post("/api/groups.add_user", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/groups.add_user", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#groups.remove_user", () => {
  it("should remove user from group", async () => {
    const user = await buildAdmin();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await server.post("/api/groups.add_user", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: user.id,
      },
    });
    const users = await group.$get("users");
    expect(users.length).toEqual(1);
    const res = await server.post("/api/groups.remove_user", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: user.id,
      },
    });
    const users1 = await group.$get("users");
    expect(res.status).toEqual(200);
    expect(users1.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/groups.remove_user");
    expect(res.status).toEqual(401);
  });

  it("should require user in team", async () => {
    const user = await buildAdmin();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser();
    const res = await server.post("/api/groups.remove_user", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/groups.remove_user", {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});
