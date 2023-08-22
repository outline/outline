import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import { TeamDomain } from "@server/models";
import Collection from "@server/models/Collection";
import UserAuthentication from "@server/models/UserAuthentication";
import { buildUser, buildTeam } from "@server/test/factories";
import { setupTestDatabase, seed } from "@server/test/support";
import accountProvisioner from "./accountProvisioner";

setupTestDatabase();

describe("accountProvisioner", () => {
  const ip = "127.0.0.1";

  describe("hosted", () => {
    beforeEach(() => {
      env.DEPLOYMENT = "hosted";
    });

    it("should create a new user and team", async () => {
      const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
      const { user, team, isNewTeam, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email: "jenny@example-company.com",
          avatarUrl: "https://example.com/avatar.png",
        },
        team: {
          name: "New workspace",
          avatarUrl: "https://example.com/avatar.png",
          subdomain: "example",
        },
        authenticationProvider: {
          name: "google",
          providerId: "example-company.com",
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
      expect(team.name).toEqual("New workspace");
      expect(user.email).toEqual("jenny@example-company.com");
      expect(isNewUser).toEqual(true);
      expect(isNewTeam).toEqual(true);
      expect(spy).toHaveBeenCalled();
      const collectionCount = await Collection.count();
      expect(collectionCount).toEqual(1);

      spy.mockRestore();
    });

    it("should update exising user and authentication", async () => {
      const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
      const existingTeam = await buildTeam();
      const providers = await existingTeam.$get("authenticationProviders");
      const authenticationProvider = providers[0];
      const existing = await buildUser({
        teamId: existingTeam.id,
      });
      const authentications = await existing.$get("authentications");
      const authentication = authentications[0];
      const newEmail = "test@example-company.com";
      const { user, isNewUser, isNewTeam } = await accountProvisioner({
        ip,
        user: {
          name: existing.name,
          email: newEmail,
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
      const auth = await UserAuthentication.findByPk(authentication.id);
      expect(auth?.accessToken).toEqual("123");
      expect(auth?.scopes.length).toEqual(1);
      expect(auth?.scopes[0]).toEqual("read");
      expect(user.email).toEqual(newEmail);
      expect(isNewTeam).toEqual(false);
      expect(isNewUser).toEqual(false);
      expect(spy).not.toHaveBeenCalled();
      const collectionCount = await Collection.count();
      expect(collectionCount).toEqual(0);

      spy.mockRestore();
    });

    it("should allow authentication by email matching", async () => {
      const existingTeam = await buildTeam();
      const providers = await existingTeam.$get("authenticationProviders");
      const authenticationProvider = providers[0];
      const userWithoutAuth = await buildUser({
        email: "email@example.com",
        teamId: existingTeam.id,
        authentications: [],
      });

      const { user, isNewUser, isNewTeam } = await accountProvisioner({
        ip,
        user: {
          name: userWithoutAuth.name,
          email: "email@example.com",
          avatarUrl: userWithoutAuth.avatarUrl,
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
          providerId: "anything",
          accessToken: "123",
          scopes: ["read"],
        },
      });
      expect(user.id).toEqual(userWithoutAuth.id);
      expect(isNewTeam).toEqual(false);
      expect(isNewUser).toEqual(false);
      expect(user.authentications.length).toEqual(0);
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
            email: "jenny@example-company.com",
            avatarUrl: "https://example.com/avatar.png",
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
      const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
      const { admin, team } = await seed();
      const authenticationProviders = await team.$get(
        "authenticationProviders"
      );
      const authenticationProvider = authenticationProviders[0];
      await TeamDomain.create({
        teamId: team.id,
        name: "example-company.com",
        createdById: admin.id,
      });

      const { user, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email: "jenny@example-company.com",
          avatarUrl: "https://example.com/avatar.png",
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
      expect(user.email).toEqual("jenny@example-company.com");
      expect(isNewUser).toEqual(true);
      expect(spy).toHaveBeenCalled();
      // should provision welcome collection
      const collectionCount = await Collection.count();
      expect(collectionCount).toEqual(1);

      spy.mockRestore();
    });

    it("should create a new user in an existing team", async () => {
      const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
      const team = await buildTeam();
      const authenticationProviders = await team.$get(
        "authenticationProviders"
      );
      const authenticationProvider = authenticationProviders[0];
      const { user, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email: "jenny@example-company.com",
          avatarUrl: "https://example.com/avatar.png",
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
      expect(user.email).toEqual("jenny@example-company.com");
      expect(isNewUser).toEqual(true);
      expect(spy).toHaveBeenCalled();
      // should provision welcome collection
      const collectionCount = await Collection.count();
      expect(collectionCount).toEqual(1);

      spy.mockRestore();
    });
  });

  describe("self hosted", () => {
    beforeEach(() => {
      env.DEPLOYMENT = undefined;
    });

    it("should fail if existing team and domain not in allowed list", async () => {
      let error;
      const team = await buildTeam();

      try {
        await accountProvisioner({
          ip,
          user: {
            name: "Jenny Tester",
            email: "jenny@example-company.com",
            avatarUrl: "https://example.com/avatar.png",
          },
          team: {
            teamId: team.id,
            name: team.name,
            avatarUrl: team.avatarUrl,
            subdomain: "example",
          },
          authenticationProvider: {
            name: "google",
            providerId: "example-company.com",
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

      expect(error.message).toEqual(
        "The maximum number of workspaces has been reached"
      );
    });

    it("should always use existing team if self-hosted", async () => {
      const team = await buildTeam();
      const { user, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email: "jenny@example-company.com",
          avatarUrl: "https://example.com/avatar.png",
        },
        team: {
          teamId: team.id,
          name: team.name,
          avatarUrl: team.avatarUrl,
          subdomain: "example",
          domain: "allowed-domain.com",
        },
        authenticationProvider: {
          name: "google",
          providerId: "allowed-domain.com",
        },
        authentication: {
          providerId: "123456789",
          accessToken: "123",
          scopes: ["read"],
        },
      });

      expect(user.teamId).toEqual(team.id);
      expect(isNewUser).toEqual(true);

      const providers = await team.$get("authenticationProviders");
      expect(providers.length).toEqual(2);
    });
  });
});
