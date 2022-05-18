import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { TeamDomain } from "@server/models";
import Collection from "@server/models/Collection";
import UserAuthentication from "@server/models/UserAuthentication";
import { buildUser, buildTeam } from "@server/test/factories";
import { flushdb, seed } from "@server/test/support";
import accountProvisioner from "./accountProvisioner";

beforeEach(() => {
  return flushdb();
});

describe("accountProvisioner", () => {
  const ip = "127.0.0.1";

  it("should create a new user and team", async () => {
    const spy = jest.spyOn(WelcomeEmail, "schedule");
    const { user, team, isNewTeam, isNewUser } = await accountProvisioner({
      ip,
      user: {
        name: "Jenny Tester",
        email: "jenny@example.com",
        avatarUrl: "https://example.com/avatar.png",
        username: "jtester",
      },
      team: {
        name: "New team",
        avatarUrl: "https://example.com/avatar.png",
        subdomain: "example",
      },
      authenticationProvider: {
        name: "google",
        providerId: "example.com",
      },
      authentication: {
        providerId: "123456789",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const authentications = await user.$get("authentications");
    const auth = authentications[0];
    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(team.name).toEqual("New team");
    expect(user.email).toEqual("jenny@example.com");
    expect(user.username).toEqual("jtester");
    expect(isNewUser).toEqual(true);
    expect(isNewTeam).toEqual(true);
    expect(spy).toHaveBeenCalled();
    const collectionCount = await Collection.count();
    expect(collectionCount).toEqual(1);

    spy.mockRestore();
  });

  it("should update exising user and authentication", async () => {
    const spy = jest.spyOn(WelcomeEmail, "schedule");
    const existingTeam = await buildTeam();
    const providers = await existingTeam.$get("authenticationProviders");
    const authenticationProvider = providers[0];
    const existing = await buildUser({
      teamId: existingTeam.id,
    });
    const authentications = await existing.$get("authentications");
    const authentication = authentications[0];
    const newEmail = "test@example.com";
    const newUsername = "tname";
    const { user, isNewUser, isNewTeam } = await accountProvisioner({
      ip,
      user: {
        name: existing.name,
        email: newEmail,
        avatarUrl: existing.avatarUrl,
        username: newUsername,
      },
      team: {
        name: existingTeam.name,
        avatarUrl: existingTeam.avatarUrl,
        subdomain: "example",
      },
      authenticationProvider: {
        name: authenticationProvider.name,
        providerId: authenticationProvider.providerId,
      },
      authentication: {
        providerId: authentication.providerId,
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const auth = await UserAuthentication.findByPk(authentication.id);
    expect(auth?.accessToken).toEqual("123");
    expect(auth?.scopes.length).toEqual(1);
    expect(auth?.scopes[0]).toEqual("read");
    expect(user.email).toEqual(newEmail);
    expect(user.username).toEqual(newUsername);
    expect(isNewTeam).toEqual(false);
    expect(isNewUser).toEqual(false);
    expect(spy).not.toHaveBeenCalled();
    const collectionCount = await Collection.count();
    expect(collectionCount).toEqual(0);

    spy.mockRestore();
  });

  it("should throw an error when authentication provider is disabled", async () => {
    const existingTeam = await buildTeam();
    const providers = await existingTeam.$get("authenticationProviders");
    const authenticationProvider = providers[0];
    await authenticationProvider.update({
      enabled: false,
    });
    const existing = await buildUser({
      teamId: existingTeam.id,
    });
    const authentications = await existing.$get("authentications");
    const authentication = authentications[0];
    let error;

    try {
      await accountProvisioner({
        ip,
        user: {
          name: existing.name,
          email: existing.email!,
          avatarUrl: existing.avatarUrl,
        },
        team: {
          name: existingTeam.name,
          avatarUrl: existingTeam.avatarUrl,
          subdomain: "example",
        },
        authenticationProvider: {
          name: authenticationProvider.name,
          providerId: authenticationProvider.providerId,
        },
        authentication: {
          providerId: authentication.providerId,
          accessToken: "123",
          scopes: ["read"],
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
  });

  it("should throw an error when the domain is not allowed", async () => {
    const { admin, team: existingTeam } = await seed();
    const providers = await existingTeam.$get("authenticationProviders");
    const authenticationProvider = providers[0];

    await TeamDomain.create({
      teamId: existingTeam.id,
      name: "other.com",
      createdById: admin.id,
    });

    let error;

    try {
      await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email: "jenny@example.com",
          avatarUrl: "https://example.com/avatar.png",
          username: "jtester",
        },
        team: {
          name: existingTeam.name,
          avatarUrl: existingTeam.avatarUrl,
          subdomain: "example",
        },
        authenticationProvider: {
          name: authenticationProvider.name,
          providerId: authenticationProvider.providerId,
        },
        authentication: {
          providerId: "123456789",
          accessToken: "123",
          scopes: ["read"],
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
  });

  it("should create a new user in an existing team when the domain is allowed", async () => {
    const spy = jest.spyOn(WelcomeEmail, "schedule");
    const { admin, team } = await seed();
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    await TeamDomain.create({
      teamId: team.id,
      name: "example.com",
      createdById: admin.id,
    });

    const { user, isNewUser } = await accountProvisioner({
      ip,
      user: {
        name: "Jenny Tester",
        email: "jenny@example.com",
        avatarUrl: "https://example.com/avatar.png",
        username: "jtester",
      },
      team: {
        name: team.name,
        avatarUrl: team.avatarUrl,
        subdomain: "example",
      },
      authenticationProvider: {
        name: authenticationProvider.name,
        providerId: authenticationProvider.providerId,
      },
      authentication: {
        providerId: "123456789",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const authentications = await user.$get("authentications");
    const auth = authentications[0];
    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(user.email).toEqual("jenny@example.com");
    expect(user.username).toEqual("jtester");
    expect(isNewUser).toEqual(true);
    expect(spy).toHaveBeenCalled();
    // should provision welcome collection
    const collectionCount = await Collection.count();
    expect(collectionCount).toEqual(1);

    spy.mockRestore();
  });

  it("should create a new user in an existing team", async () => {
    const spy = jest.spyOn(WelcomeEmail, "schedule");
    const team = await buildTeam();
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const { user, isNewUser } = await accountProvisioner({
      ip,
      user: {
        name: "Jenny Tester",
        email: "jenny@example.com",
        avatarUrl: "https://example.com/avatar.png",
        username: "jtester",
      },
      team: {
        name: team.name,
        avatarUrl: team.avatarUrl,
        subdomain: "example",
      },
      authenticationProvider: {
        name: authenticationProvider.name,
        providerId: authenticationProvider.providerId,
      },
      authentication: {
        providerId: "123456789",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const authentications = await user.$get("authentications");
    const auth = authentications[0];
    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(user.email).toEqual("jenny@example.com");
    expect(user.username).toEqual("jtester");
    expect(isNewUser).toEqual(true);
    expect(spy).toHaveBeenCalled();
    // should provision welcome collection
    const collectionCount = await Collection.count();
    expect(collectionCount).toEqual(1);

    spy.mockRestore();
  });
});
