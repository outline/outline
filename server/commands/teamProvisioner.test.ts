import { faker } from "@faker-js/faker";
import TeamDomain from "@server/models/TeamDomain";
import { buildTeam, buildUser } from "@server/test/factories";
import { setSelfHosted } from "@server/test/support";
import teamProvisioner from "./teamProvisioner";
import { createContext } from "@server/context";

describe("teamProvisioner", () => {
  const ip = faker.internet.ip();
  const ctx = createContext({ ip });

  describe("hosted", () => {
    it("should create team and authentication provider", async () => {
      const subdomain = faker.internet.domainWord();
      const result = await teamProvisioner(ctx, {
        name: "Test team",
        subdomain,
        avatarUrl: faker.image.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
      });
      const { team, authenticationProvider, isNewTeam } = result;
      expect(authenticationProvider.name).toEqual("google");
      expect(authenticationProvider.providerId).toEqual(`${subdomain}.com`);
      expect(team.name).toEqual("Test team");
      expect(team.subdomain).toEqual(subdomain);
      expect(isNewTeam).toEqual(true);
    });

    it("should set subdomain append if unavailable", async () => {
      const subdomain = faker.internet.domainWord();

      await buildTeam({
        subdomain,
      });

      const result = await teamProvisioner(ctx, {
        name: "Test team",
        subdomain,
        avatarUrl: faker.image.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
      });

      expect(result.isNewTeam).toEqual(true);
      expect(result.team.subdomain).toEqual(`${subdomain}1`);
    });

    it("should increment subdomain append if unavailable", async () => {
      const subdomain = faker.internet.domainWord();
      await buildTeam({
        subdomain,
      });
      await buildTeam({
        subdomain: `${subdomain}1`,
      });
      const result = await teamProvisioner(ctx, {
        name: "Test team",
        subdomain,
        avatarUrl: faker.image.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
      });

      expect(result.team.subdomain).toEqual(`${subdomain}2`);
    });

    it("should return existing team", async () => {
      const subdomain = faker.internet.domainWord();
      const authenticationProvider = {
        name: "google",
        providerId: `${subdomain}.com`,
      };
      const existing = await buildTeam({
        subdomain,
        authenticationProviders: [authenticationProvider],
      });
      const result = await teamProvisioner(ctx, {
        name: faker.company.name(),
        subdomain,
        authenticationProvider,
      });
      const { team, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(team.subdomain).toEqual(subdomain);
      expect(isNewTeam).toEqual(false);
    });

    it("should return non-deleted team if multiple matches", async () => {
      const subdomain = faker.internet.domainWord();
      const authenticationProvider = {
        name: "google",
        providerId: `${subdomain}.com`,
      };
      await buildTeam({
        subdomain: undefined,
        deletedAt: new Date(),
        authenticationProviders: [authenticationProvider],
      });
      const notDeleted = await buildTeam({
        subdomain: undefined,
        authenticationProviders: [authenticationProvider],
      });
      await buildTeam({
        subdomain: undefined,
        deletedAt: new Date(),
        authenticationProviders: [authenticationProvider],
      });
      const result = await teamProvisioner(ctx, {
        name: faker.company.name(),
        subdomain,
        authenticationProvider,
      });
      const { team, isNewTeam } = result;
      expect(team.id).toEqual(notDeleted.id);
      expect(isNewTeam).toEqual(false);
    });

    it("should error on mismatched team and authentication provider", async () => {
      const subdomain = faker.internet.domainWord();

      const exampleTeam = await buildTeam({
        subdomain,
        authenticationProviders: [
          {
            name: "google",
            providerId: `${subdomain}.com`,
          },
        ],
      });

      let error;
      try {
        const testSubdomain = faker.internet.domainWord();
        await teamProvisioner(ctx, {
          teamId: exampleTeam.id,
          name: "name",
          subdomain: testSubdomain,
          authenticationProvider: {
            name: "google",
            providerId: `${testSubdomain}.com`,
          },
        });
      } catch (e) {
        error = e;
      }
      expect(error.id).toEqual("invalid_authentication");
    });
  });

  describe("self hosted", () => {
    beforeEach(setSelfHosted);

    it("should allow creating first team", async () => {
      const subdomain = faker.internet.domainWord();
      const { team, isNewTeam } = await teamProvisioner(ctx, {
        name: "Test team",
        subdomain,
        avatarUrl: faker.image.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
      });

      expect(isNewTeam).toBeTruthy();
      expect(team.name).toEqual("Test team");
    });

    it("should not allow creating multiple teams in installation", async () => {
      const team = await buildTeam();
      const subdomain = faker.internet.domainWord();
      let error;

      try {
        await teamProvisioner(ctx, {
          name: "Test team",
          subdomain,
          avatarUrl: faker.image.avatar(),
          teamId: team.id,
          authenticationProvider: {
            name: "google",
            providerId: `${subdomain}.com`,
          },
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeTruthy();
    });

    it("should return existing team when within allowed domains", async () => {
      const domain = faker.internet.domainName();
      const existing = await buildTeam();
      const user = await buildUser({
        teamId: existing.id,
      });
      await TeamDomain.create({
        teamId: existing.id,
        name: domain,
        createdById: user.id,
      });
      const result = await teamProvisioner(ctx, {
        name: "Updated name",
        subdomain: faker.internet.domainWord(),
        domain,
        teamId: existing.id,
        authenticationProvider: {
          name: "google",
          providerId: domain,
        },
      });
      const { team, authenticationProvider, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(authenticationProvider.name).toEqual("google");
      expect(authenticationProvider.providerId).toEqual(domain);
      expect(isNewTeam).toEqual(false);
      const providers = await team.$get("authenticationProviders");
      expect(providers.length).toEqual(2);
    });

    it("should error when NOT within allowed domains", async () => {
      const existing = await buildTeam();
      const user = await buildUser({
        teamId: existing.id,
      });
      const allowedDomain = faker.internet.domainName();
      const otherDomain = faker.internet.domainName();
      await TeamDomain.create({
        teamId: existing.id,
        name: allowedDomain,
        createdById: user.id,
      });

      let error;
      try {
        await teamProvisioner(ctx, {
          name: "Updated name",
          subdomain: faker.internet.domainWord(),
          domain: otherDomain,
          teamId: existing.id,
          authenticationProvider: {
            name: "google",
            providerId: otherDomain,
          },
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeTruthy();
    });

    it("should return existing team", async () => {
      const authenticationProvider = {
        name: "google",
        providerId: faker.internet.domainName(),
      };
      const subdomain = faker.internet.domainWord();
      const existing = await buildTeam({
        subdomain,
        authenticationProviders: [authenticationProvider],
      });
      const result = await teamProvisioner(ctx, {
        name: "Updated name",
        subdomain,
        authenticationProvider,
      });
      const { team, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(team.subdomain).toEqual(subdomain);
      expect(isNewTeam).toEqual(false);
    });
  });
});
