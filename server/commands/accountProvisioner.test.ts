import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { TeamDomain } from "@server/models";
import Collection from "@server/models/Collection";
import UserAuthentication from "@server/models/UserAuthentication";
import { buildUser, buildTeam, buildAdmin } from "@server/test/factories";
import { setSelfHosted } from "@server/test/support";
import accountProvisioner from "./accountProvisioner";

describe("accountProvisioner", () => {
  const ip = "127.0.0.1";

  describe("hosted", () => {
    it("should create a new user and team", async () => {
      const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
      const email = faker.internet.email().toLowerCase();
      const { user, team, isNewTeam, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email,
          avatarUrl: faker.internet.avatar(),
        },
        team: {
          name: "New workspace",
          avatarUrl: faker.internet.avatar(),
          subdomain: faker.internet.domainWord(),
        },
        authenticationProvider: {
          name: "google",
          providerId: faker.internet.domainName(),
        },
        authentication: {
          providerId: uuidv4(),
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
      expect(user.email).toEqual(email);
      expect(isNewUser).toEqual(true);
      expect(isNewTeam).toEqual(true);
      expect(spy).toHaveBeenCalled();
      const collectionCount = await Collection.count({
        where: {
          teamId: team.id,
        },
      });
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
      const newEmail = faker.internet.email().toLowerCase();
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
          subdomain: faker.internet.domainWord(),
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

      spy.mockRestore();
    });

    it("should allow authentication by email matching", async () => {
      const subdomain = faker.internet.domainWord();
      const existingTeam = await buildTeam({
        subdomain,
      });

      const providers = await existingTeam.$get("authenticationProviders");
      const authenticationProvider = providers[0];
      const email = faker.internet.email().toLowerCase();
      const userWithoutAuth = await buildUser({
        email,
        teamId: existingTeam.id,
        authentications: [],
      });

      const { user, isNewUser, isNewTeam } = await accountProvisioner({
        ip,
        user: {
          name: userWithoutAuth.name,
          email,
          avatarUrl: userWithoutAuth.avatarUrl,
        },
        team: {
          teamId: existingTeam.id,
          name: existingTeam.name,
          avatarUrl: existingTeam.avatarUrl,
          subdomain,
        },
        authenticationProvider: {
          name: authenticationProvider.name,
          providerId: authenticationProvider.providerId,
        },
        authentication: {
          providerId: uuidv4(),
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
            subdomain: faker.internet.domainWord(),
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

    it("should prioritize enabled authentication provider", async () => {
      const existingTeam = await buildTeam();
      const existingProviders = await existingTeam.$get(
        "authenticationProviders"
      );

      const team2 = await buildTeam();

      const providers = await team2.$get("authenticationProviders");
      const authenticationProvider = providers[0];
      await authenticationProvider.update({
        enabled: false,
        providerId: existingProviders[0].providerId,
      });

      const existing = await buildUser({
        teamId: existingTeam.id,
      });
      const authentications = await existing.$get("authentications");
      const authentication = authentications[0];
      const { isNewUser, isNewTeam } = await accountProvisioner({
        ip,
        user: {
          name: existing.name,
          email: existing.email!,
          avatarUrl: existing.avatarUrl,
        },
        team: {
          name: existingTeam.name,
          avatarUrl: existingTeam.avatarUrl,
          subdomain: faker.internet.domainWord(),
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
      expect(isNewTeam).toEqual(false);
      expect(isNewUser).toEqual(false);
    });

    it("should throw an error when the domain is not allowed", async () => {
      const existingTeam = await buildTeam();
      const admin = await buildAdmin({ teamId: existingTeam.id });
      const providers = await existingTeam.$get("authenticationProviders");
      const authenticationProvider = providers[0];
      const email = faker.internet.email().toLowerCase();

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
            email,
            avatarUrl: faker.internet.avatar(),
          },
          team: {
            name: existingTeam.name,
            avatarUrl: existingTeam.avatarUrl,
            subdomain: faker.internet.domainWord(),
          },
          authenticationProvider: {
            name: authenticationProvider.name,
            providerId: authenticationProvider.providerId,
          },
          authentication: {
            providerId: uuidv4(),
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
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const authenticationProviders = await team.$get(
        "authenticationProviders"
      );
      const authenticationProvider = authenticationProviders[0];
      const domain = faker.internet.domainName();
      await TeamDomain.create({
        teamId: team.id,
        name: domain,
        createdById: admin.id,
      });
      const email = faker.internet.email({ provider: domain });
      const { user, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email,
          avatarUrl: faker.internet.avatar(),
        },
        team: {
          name: team.name,
          avatarUrl: team.avatarUrl,
          subdomain: faker.internet.domainWord(),
        },
        authenticationProvider: {
          name: authenticationProvider.name,
          providerId: authenticationProvider.providerId,
        },
        authentication: {
          providerId: uuidv4(),
          accessToken: "123",
          scopes: ["read"],
        },
      });
      const authentications = await user.$get("authentications");
      const auth = authentications[0];
      expect(auth.accessToken).toEqual("123");
      expect(auth.scopes.length).toEqual(1);
      expect(auth.scopes[0]).toEqual("read");
      expect(user.email).toEqual(email);
      expect(isNewUser).toEqual(true);
      expect(spy).toHaveBeenCalled();
      // should provision welcome collection
      const collectionCount = await Collection.count({
        where: {
          teamId: team.id,
        },
      });
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
      const email = faker.internet.email().toLowerCase();
      const { user, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email,
          avatarUrl: faker.internet.avatar(),
        },
        team: {
          name: team.name,
          avatarUrl: team.avatarUrl,
          subdomain: faker.internet.domainWord(),
        },
        authenticationProvider: {
          name: authenticationProvider.name,
          providerId: authenticationProvider.providerId,
        },
        authentication: {
          providerId: uuidv4(),
          accessToken: "123",
          scopes: ["read"],
        },
      });
      const authentications = await user.$get("authentications");
      const auth = authentications[0];
      expect(auth.accessToken).toEqual("123");
      expect(auth.scopes.length).toEqual(1);
      expect(auth.scopes[0]).toEqual("read");
      expect(user.email).toEqual(email);
      expect(isNewUser).toEqual(true);
      expect(spy).toHaveBeenCalled();
      // should provision welcome collection
      const collectionCount = await Collection.count({
        where: {
          teamId: team.id,
        },
      });
      expect(collectionCount).toEqual(1);

      spy.mockRestore();
    });
  });

  describe("self hosted", () => {
    beforeEach(setSelfHosted);

    it("should fail if existing team and domain not in allowed list", async () => {
      let error;
      const team = await buildTeam();

      try {
        await accountProvisioner({
          ip,
          user: {
            name: "Jenny Tester",
            email: faker.internet.email(),
            avatarUrl: faker.internet.avatar(),
          },
          team: {
            teamId: team.id,
            name: team.name,
            avatarUrl: team.avatarUrl,
            subdomain: faker.internet.domainWord(),
          },
          authenticationProvider: {
            name: "google",
            providerId: faker.internet.domainName(),
          },
          authentication: {
            providerId: uuidv4(),
            accessToken: "123",
            scopes: ["read"],
          },
        });
      } catch (err) {
        error = err;
      }

      expect(error.message).toEqual("Invalid authentication");
    });

    it("should always use existing team if self-hosted", async () => {
      const team = await buildTeam();
      const domain = faker.internet.domainName();
      const { user, isNewUser } = await accountProvisioner({
        ip,
        user: {
          name: "Jenny Tester",
          email: faker.internet.email(),
          avatarUrl: faker.internet.avatar(),
        },
        team: {
          teamId: team.id,
          name: team.name,
          avatarUrl: team.avatarUrl,
          subdomain: faker.internet.domainWord(),
          domain,
        },
        authenticationProvider: {
          name: "google",
          providerId: domain,
        },
        authentication: {
          providerId: uuidv4(),
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
