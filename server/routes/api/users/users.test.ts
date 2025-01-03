import { faker } from "@faker-js/faker";
import { TeamPreference, UserRole } from "@shared/types";
import ConfirmUpdateEmail from "@server/emails/templates/ConfirmUpdateEmail";
import { TeamDomain } from "@server/models";
import {
  buildTeam,
  buildAdmin,
  buildUser,
  buildInvite,
  buildViewer,
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
  it("should return users whose emails match the query", async () => {
    const user = await buildUser({
      name: "John Doe",
      email: "john.doe@example.com",
    });

    const res = await server.post("/api/users.list", {
      body: {
        query: "john.doe@e",
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(user.id);
  });

  it("should allow filtering by user name", async () => {
    const user = await buildUser({
      name: "Tèster",
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

  it("should allow filtering by role", async () => {
    const user = await buildUser({
      name: "Tester",
    });
    const admin = await buildAdmin({
      name: "Admin",
      teamId: user.teamId,
    });
    const res = await server.post("/api/users.list", {
      body: {
        role: UserRole.Admin,
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(admin.id);
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

  it("should restrict guest from viewing other user's email", async () => {
    const team = await buildTeam();
    await buildUser({ teamId: team.id });
    const guest = await buildUser({ teamId: team.id, role: UserRole.Guest });
    const res = await server.post("/api/users.list", {
      body: {
        token: guest.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].email).toEqual(undefined);
    expect(body.data[1].email).toEqual(guest.email);
  });

  it("should restrict viewer from viewing other user's email", async () => {
    const team = await buildTeam();
    await buildUser({ teamId: team.id });
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const res = await server.post("/api/users.list", {
      body: {
        token: viewer.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].email).toEqual(undefined);
    expect(body.data[1].email).toEqual(viewer.email);
  });

  it("should allow member to view other user's email", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const member = await buildUser({ teamId: team.id, role: UserRole.Member });
    const res = await server.post("/api/users.list", {
      body: {
        token: member.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].email).toEqual(user.email);
    expect(body.data[1].email).toEqual(member.email);
  });

  it("should restrict guest from viewing other user's details", async () => {
    const team = await buildTeam();
    await buildUser({ teamId: team.id });
    const guest = await buildUser({ teamId: team.id, role: UserRole.Guest });
    const res = await server.post("/api/users.list", {
      body: {
        token: guest.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].language).toEqual(undefined);
    expect(body.data[0].preferences).toEqual(undefined);
    expect(body.data[0].notificationSettings).toEqual(undefined);
    expect(body.data[1].language).toEqual(guest.language);
    expect(body.data[1].preferences).toEqual(guest.preferences);
    expect(body.data[1].notificationSettings).toEqual(
      guest.notificationSettings
    );
  });

  it("should restrict viewer from viewing other user's details", async () => {
    const team = await buildTeam();
    await buildUser({ teamId: team.id });
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const res = await server.post("/api/users.list", {
      body: {
        token: viewer.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].language).toEqual(undefined);
    expect(body.data[0].preferences).toEqual(undefined);
    expect(body.data[0].notificationSettings).toEqual(undefined);
    expect(body.data[1].language).toEqual(viewer.language);
    expect(body.data[1].preferences).toEqual(viewer.preferences);
    expect(body.data[1].notificationSettings).toEqual(
      viewer.notificationSettings
    );
  });

  it("should restrict member from viewing other user's details", async () => {
    const team = await buildTeam();
    await buildUser({ teamId: team.id });
    const member = await buildUser({ teamId: team.id, role: UserRole.Member });
    const res = await server.post("/api/users.list", {
      body: {
        token: member.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].language).toEqual(undefined);
    expect(body.data[0].preferences).toEqual(undefined);
    expect(body.data[0].notificationSettings).toEqual(undefined);
    expect(body.data[1].language).toEqual(member.language);
    expect(body.data[1].preferences).toEqual(member.preferences);
    expect(body.data[1].notificationSettings).toEqual(
      member.notificationSettings
    );
  });

  it("should allow admin to view other user's details", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].language).toEqual(user.language);
    expect(body.data[0].preferences).toEqual(user.preferences);
    expect(body.data[0].notificationSettings).toEqual(
      user.notificationSettings
    );
    expect(body.data[1].language).toEqual(admin.language);
    expect(body.data[1].preferences).toEqual(admin.preferences);
    expect(body.data[1].notificationSettings).toEqual(
      admin.notificationSettings
    );
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

  it("should allow members to invite members", async () => {
    const user = await buildUser();
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

  it("should now allow viewers to invite", async () => {
    const user = await buildViewer();
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
    expect(res.status).toEqual(403);
  });

  it("should allow restricting invites to admin", async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.MembersCanInvite, false);
    await team.save();

    const user = await buildUser({ teamId: team.id });
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
    expect(body.data.users[0].role).toEqual(UserRole.Admin);
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
    expect(body.data.users[0].role).toEqual(UserRole.Viewer);
  });

  it("should limit number of invites", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.invite", {
      body: {
        token: user.getJwtToken(),
        invites: new Array(21).fill({
          email: "test@example.com",
          name: "Test",
          role: "viewer",
        }),
      },
    });
    expect(res.status).toEqual(400);
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

  it("should update user timezone", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.update", {
      body: {
        token: user.getJwtToken(),
        timezone: "Asia/Calcutta",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.timezone).toEqual("Asia/Calcutta");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/users.update");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#users.updateEmail", () => {
  describe("post", () => {
    it("should trigger verification email", async () => {
      const spy = jest.spyOn(ConfirmUpdateEmail.prototype, "schedule");
      const user = await buildUser();
      const res = await server.post("/api/users.updateEmail", {
        body: {
          token: user.getJwtToken(),
          email: faker.internet.email(),
        },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      expect(body.success).toEqual(true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should fail if email not in allowed domains", async () => {
      const user = await buildUser();

      await TeamDomain.create({
        teamId: user.teamId,
        name: "example.com",
        createdById: user.id,
      });

      const res = await server.post("/api/users.updateEmail", {
        body: {
          token: user.getJwtToken(),
          email: faker.internet.email(),
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(400);
      expect(body).toMatchSnapshot();
    });

    it("should fail if email not unique in workspace", async () => {
      const user = await buildUser();
      const email = faker.internet.email().toLowerCase();
      await buildUser({ teamId: user.teamId, email });

      const res = await server.post("/api/users.updateEmail", {
        body: {
          token: user.getJwtToken(),
          email,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(400);
      expect(body).toMatchSnapshot();
    });

    it("should require authentication", async () => {
      const res = await server.post("/api/users.updateEmail");
      const body = await res.json();
      expect(res.status).toEqual(401);
      expect(body).toMatchSnapshot();
    });
  });

  describe("get", () => {
    it("should update email", async () => {
      const user = await buildUser();
      const email = faker.internet.email();
      await server.get(
        `/api/users.updateEmail?token=${user.getJwtToken()}&code=${user.getEmailUpdateToken(
          email
        )}&follow=true`
      );

      await user.reload();
      expect(user.email).toEqual(email);
    });
  });
});

describe("#users.update_role", () => {
  it("should promote", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/users.update_role", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
        role: UserRole.Admin,
      },
    });
    expect(res.status).toEqual(200);
    expect((await user.reload()).role).toEqual(UserRole.Admin);
  });

  it("should demote", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/users.update_role", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
        role: UserRole.Viewer,
      },
    });
    expect(res.status).toEqual(200);
    expect((await user.reload()).role).toEqual(UserRole.Viewer);
  });

  it("should error on same role", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/users.update_role", {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
        role: UserRole.Admin,
      },
    });
    expect(res.status).toEqual(400);
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
    const user = await buildAdmin({ teamId: team.id });

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
    const user = await buildAdmin({ teamId: team.id });

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
    const user = await buildAdmin({ teamId: team.id });

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
    await buildAdmin({ teamId: admin.teamId });
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
