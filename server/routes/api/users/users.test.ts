import {
  buildTeam,
  buildAdmin,
  buildUser,
  buildInvite,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date("2018-01-02T00:00:00.000Z"));
});
afterAll(() => {
  jest.useRealTimers();
});

describe("#users.list", () => {
  it("should allow filtering by user name", async () => {
    const user = await buildUser({
      name: "Tester",
    });
    // suspended user should not be returned
    await buildUser({
      name: "Tester",
      teamId: user.teamId,
      suspendedAt: new Date(),
    });
    const res = await server.post("/api/users.list", {
      body: {
        query: "test",
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(user.id);
  });

  it("should allow filtering to suspended users", async () => {
    const admin = await buildAdmin();
    await buildUser({
      name: "Tester",
      teamId: admin.teamId,
      suspendedAt: new Date(),
    });
    const res = await server.post("/api/users.list", {
      body: {
        query: "test",
        filter: "suspended",
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should not allow members to view suspended users", async () => {
    const user = await buildUser();
    await buildUser({
      name: "Tester",
      teamId: user.teamId,
      suspendedAt: new Date(),
    });
    const res = await server.post("/api/users.list", {
      body: {
        query: "test",
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should allow filtering to active", async () => {
    const user = await buildUser({
      name: "Tester",
    });
    await buildInvite({
      name: "Tester",
      teamId: user.teamId,
    });
    const res = await server.post("/api/users.list", {
      body: {
        query: "test",
        filter: "active",
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should allow filtering to invited", async () => {
    const user = await buildUser({
      name: "Tester",
    });
    await buildUser({
      name: "Tester",
      teamId: user.teamId,
      lastActiveAt: null,
    });
    const res = await server.post("/api/users.list", {
      body: {
        query: "test",
        filter: "invited",
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should return teams paginated user list", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    await buildUser({ teamId: team.id });

    const res = await server.post("/api/users.list", {
      body: {
        token: admin.getJwtToken(),
        sort: "createdAt",
        direction: "DESC",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
  });

  it("should allow filtering by id", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/users.list", {
      body: {
        token: admin.getJwtToken(),
        ids: [user.id],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(user.id);
  });

  it("should allow filtering by email", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/users.list", {
      body: {
        token: admin.getJwtToken(),
        emails: [user.email],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(user.id);
  });

  it("should require admin for detailed info", async () => {
    const team = await buildTeam();
    await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].email).toEqual(undefined);
    expect(body.data[1].email).toEqual(undefined);
  });
});

describe("#users.info", () => {
  it("should return current user with no id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(user.id);
    expect(body.data.name).toEqual(user.name);
    expect(body.data.email).toEqual(user.email);
  });

  it("should return user with permission", async () => {
    const user = await buildUser();
    const another = await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/users.info", {
      body: {
        token: user.getJwtToken(),
        id: another.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(another.id);
    expect(body.data.name).toEqual(another.name);
    // no emails of other users
    expect(body.data.email).toEqual(undefined);
  });

  it("should now return user without permission", async () => {
    const user = await buildUser();
    const another = await buildUser();
    const res = await server.post("/api/users.info", {
      body: {
        token: user.getJwtToken(),
        id: another.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/users.info");
    expect(res.status).toEqual(401);
  });
});

describe("#users.invite", () => {
  it("should return sent invites", async () => {
    const user = await buildAdmin();
    const res = await server.post("/api/users.invite", {
      body: {
        token: user.getJwtToken(),
        invites: [
          {
            email: "test@example.com",
            name: "Test",
            role: "member",
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.sent.length).toEqual(1);
  });

  it("should require invites to be an array", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/users.invite", {
      body: {
        token: admin.getJwtToken(),
        invites: {
          email: "test@example.com",
          name: "Test",
          role: "member",
        },
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should require admin", async () => {
    const admin = await buildUser();
    const res = await server.post("/api/users.invite", {
      body: {
        token: admin.getJwtToken(),
        invites: [
          {
            email: "test@example.com",
            name: "Test",
            role: "member",
          },
        ],
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should invite user as an admin", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/users.invite", {
      body: {
        token: admin.getJwtToken(),
        invites: [
          {
            email: "test@example.com",
            name: "Test",
            role: "admin",
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.sent.length).toEqual(1);
    expect(body.data.users[0].isAdmin).toBeTruthy();
    expect(body.data.users[0].isViewer).toBeFalsy();
  });

  it("should invite user as a viewer", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/users.invite", {
      body: {
        token: admin.getJwtToken(),
        invites: [
          {
            email: "test@example.com",
            name: "Test",
            role: "viewer",
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.sent.length).toEqual(1);
    expect(body.data.users[0].isViewer).toBeTruthy();
    expect(body.data.users[0].isAdmin).toBeFalsy();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/users.invite");
    expect(res.status).toEqual(401);
  });
});

describe("#users.delete", () => {
  it("should not allow deleting last admin if many users", async () => {
    const user = await buildAdmin();
    await buildUser({
      teamId: user.teamId,
      isAdmin: false,
    });
    const res = await server.post("/api/users.delete", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should require correct code when no id passed", async () => {
    const user = await buildAdmin();
    await buildUser({
      teamId: user.teamId,
      isAdmin: false,
    });
    const res = await server.post("/api/users.delete", {
      body: {
        code: "123",
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should allow deleting user account with correct code", async () => {
    const user = await buildUser();
    await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/users.delete", {
      body: {
        code: user.deleteConfirmationCode,
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should allow deleting user account as admin", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/users.delete", {
      body: {
        id: user.id,
        token: admin.getJwtToken(),
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/users.delete");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.update", () => {
  it("should update user profile information", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.update", {
      body: {
        token: user.getJwtToken(),
        name: "New name",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("New name");
  });

  it("should allow admin to update other user's profile info", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/users.update", {
      body: {
        id: user.id,
        token: admin.getJwtToken(),
        name: "New name",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("New name");
    expect(body.data.avatarUrl).toBe(user.avatarUrl);
  });

  it("should disallow non-admin to update other user's profile info", async () => {
    const actor = await buildUser();
    const user = await buildUser({
      teamId: actor.teamId,
    });
    const res = await server.post("/api/users.update", {
      body: {
        id: user.id,
        token: actor.getJwtToken(),
        name: "New name",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should fail upon sending invalid user preference", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.update", {
      body: {
        token: user.getJwtToken(),
        name: "New name",
        preferences: { invalidPreference: "invalidValue" },
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should fail upon sending invalid user preference value", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.update", {
      body: {
        token: user.getJwtToken(),
        name: "New name",
        preferences: { rememberLastPath: "invalidValue" },
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should update rememberLastPath user preference", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.update", {
      body: {
        token: user.getJwtToken(),
        name: "New name",
        preferences: {
          rememberLastPath: true,
        },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.preferences.rememberLastPath).toBe(true);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/users.update");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.promote", () => {
  it("should promote a new admin", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/users.promote", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.promote", {
      body: {
        token: user.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.demote", () => {
  it("should demote an admin", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    await user.update({
      isAdmin: true,
    }); // Make another admin

    const res = await server.post("/api/users.demote", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should demote an admin to viewer", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    await user.update({
      isAdmin: true,
    }); // Make another admin

    const res = await server.post("/api/users.demote", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
        to: "viewer",
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should demote an admin to member", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    await user.update({
      isAdmin: true,
    }); // Make another admin

    const res = await server.post("/api/users.demote", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
        to: "member",
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should not allow demoting self", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/users.demote", {
      body: {
        token: admin.getJwtToken(),
        id: admin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.promote", {
      body: {
        token: user.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.suspend", () => {
  it("should suspend an user", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/users.suspend", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should not allow suspending the user themselves", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/users.suspend", {
      body: {
        token: admin.getJwtToken(),
        id: admin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.suspend", {
      body: {
        token: user.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.activate", () => {
  it("should activate a suspended user", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    await user.update({
      suspendedById: admin.id,
      suspendedAt: new Date(),
    });
    expect(user.isSuspended).toBe(true);
    const res = await server.post("/api/users.activate", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.activate", {
      body: {
        token: user.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.count", () => {
  it("should count active users", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.count", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.counts.all).toEqual(1);
    expect(body.data.counts.admins).toEqual(0);
    expect(body.data.counts.invited).toEqual(0);
    expect(body.data.counts.suspended).toEqual(0);
    expect(body.data.counts.active).toEqual(1);
  });

  it("should count admin users", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      isAdmin: true,
    });
    const res = await server.post("/api/users.count", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.counts.all).toEqual(1);
    expect(body.data.counts.admins).toEqual(1);
    expect(body.data.counts.invited).toEqual(0);
    expect(body.data.counts.suspended).toEqual(0);
    expect(body.data.counts.active).toEqual(1);
  });

  it("should count suspended users", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildUser({
      teamId: team.id,
      suspendedAt: new Date(),
    });
    const res = await server.post("/api/users.count", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.counts.all).toEqual(2);
    expect(body.data.counts.admins).toEqual(0);
    expect(body.data.counts.invited).toEqual(0);
    expect(body.data.counts.suspended).toEqual(1);
    expect(body.data.counts.active).toEqual(1);
  });

  it("should count invited users", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      lastActiveAt: null,
    });
    const res = await server.post("/api/users.count", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.counts.all).toEqual(1);
    expect(body.data.counts.admins).toEqual(0);
    expect(body.data.counts.invited).toEqual(1);
    expect(body.data.counts.suspended).toEqual(0);
    expect(body.data.counts.active).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/users.count");
    expect(res.status).toEqual(401);
  });
});
