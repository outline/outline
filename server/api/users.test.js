/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";

import { buildTeam, buildAdmin, buildUser } from "../test/factories";

import { flushdb, seed } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#users.list", () => {
  it("should allow filtering by user name", async () => {
    const user = await buildUser({ name: "Tester" });

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

  it("should allow including suspended", async () => {
    const user = await buildUser({ name: "Tester" });
    await buildUser({
      name: "Tester",
      teamId: user.teamId,
      suspendedAt: new Date(),
    });

    const res = await server.post("/api/users.list", {
      body: {
        query: "test",
        includeSuspended: true,
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
  });

  it("should return teams paginated user list", async () => {
    const { admin, user } = await seed();

    const res = await server.post("/api/users.list", {
      body: { token: admin.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].id).toEqual(user.id);
    expect(body.data[1].id).toEqual(admin.id);
  });

  it("should require admin for detailed info", async () => {
    const { user, admin } = await seed();
    const res = await server.post("/api/users.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].email).toEqual(undefined);
    expect(body.data[1].email).toEqual(undefined);
    expect(body.data[0].id).toEqual(user.id);
    expect(body.data[1].id).toEqual(admin.id);
  });
});

describe("#users.info", () => {
  it("should return current user with no id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.info", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(user.id);
    expect(body.data.name).toEqual(user.name);
    expect(body.data.email).toEqual(user.email);
  });

  it("should return user with permission", async () => {
    const user = await buildUser();
    const another = await buildUser({ teamId: user.teamId });
    const res = await server.post("/api/users.info", {
      body: { token: user.getJwtToken(), id: another.id },
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
      body: { token: user.getJwtToken(), id: another.id },
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
        invites: [{ email: "test@example.com", name: "Test", guest: false }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.sent.length).toEqual(1);
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.invite", {
      body: {
        token: user.getJwtToken(),
        invites: [{ email: "test@example.com", name: "Test", guest: false }],
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/users.invite");
    expect(res.status).toEqual(401);
  });
});

describe("#users.delete", () => {
  it("should not allow deleting without confirmation", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.delete", {
      body: { token: user.getJwtToken() },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow deleting last admin if many users", async () => {
    const user = await buildAdmin();
    await buildUser({ teamId: user.teamId, isAdmin: false });

    const res = await server.post("/api/users.delete", {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(400);
  });

  it("should allow deleting user account with confirmation", async () => {
    const user = await buildUser();
    await buildUser({ teamId: user.teamId });

    const res = await server.post("/api/users.delete", {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(200);
  });

  it("should allow deleting pending user account with admin", async () => {
    const user = await buildAdmin();
    const pending = await buildUser({
      teamId: user.teamId,
      lastActiveAt: null,
    });
    const res = await server.post("/api/users.delete", {
      body: { token: user.getJwtToken(), id: pending.id, confirmation: true },
    });
    expect(res.status).toEqual(200);
  });

  it("should not allow deleting another user account", async () => {
    const user = await buildAdmin();
    const user2 = await buildUser({ teamId: user.teamId });
    const res = await server.post("/api/users.delete", {
      body: { token: user.getJwtToken(), id: user2.id, confirmation: true },
    });
    expect(res.status).toEqual(403);
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
    const { user } = await seed();
    const res = await server.post("/api/users.update", {
      body: { token: user.getJwtToken(), name: "New name" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("New name");
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
    const { admin, user } = await seed();

    const res = await server.post("/api/users.promote", {
      body: { token: admin.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.promote", {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.demote", () => {
  it("should demote an admin", async () => {
    const { admin, user } = await seed();
    await user.update({ isAdmin: true }); // Make another admin

    const res = await server.post("/api/users.demote", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("should demote an admin to viewer", async () => {
    const { admin, user } = await seed();
    await user.update({ isAdmin: true }); // Make another admin

    const res = await server.post("/api/users.demote", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
        to: "Viewer",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("should demote an admin to member", async () => {
    const { admin, user } = await seed();
    await user.update({ isAdmin: true }); // Make another admin

    const res = await server.post("/api/users.demote", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
        to: "Member",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("should not demote admins if only one available", async () => {
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
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.suspend", () => {
  it("should suspend an user", async () => {
    const { admin, user } = await seed();

    const res = await server.post("/api/users.suspend", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
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
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.activate", () => {
  it("should activate a suspended user", async () => {
    const { admin, user } = await seed();
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
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.activate", {
      body: { token: user.getJwtToken(), id: user.id },
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
      body: { token: user.getJwtToken() },
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
    const user = await buildUser({ teamId: team.id, isAdmin: true });
    const res = await server.post("/api/users.count", {
      body: { token: user.getJwtToken() },
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
    await buildUser({ teamId: team.id, suspendedAt: new Date() });
    const res = await server.post("/api/users.count", {
      body: { token: user.getJwtToken() },
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
    const user = await buildUser({ teamId: team.id, lastActiveAt: null });
    const res = await server.post("/api/users.count", {
      body: { token: user.getJwtToken() },
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
