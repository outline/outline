import { faker } from "@faker-js/faker";
import TeamDomain from "@server/models/TeamDomain";
import { buildTeam, buildUser } from "@server/test/factories";
import { setSelfHosted } from "@server/test/support";
import teamProvisioner from "./teamProvisioner";

describe("teamProvisioner", () => {
  const ip = "127.0.0.1";

  describe("hosted", () => {
    it("should create team and authentication provider", async () => {
      const subdomain = faker.internet.domainWord();
      const result = await teamProvisioner({
        name: "Test team",
        subdomain,
        avatarUrl: faker.internet.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
        ip,
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

      const result = await teamProvisioner({
        name: "Test team",
        subdomain,
        avatarUrl: faker.internet.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
        ip,
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
      const result = await teamProvisioner({
        name: "Test team",
        subdomain,
        avatarUrl: faker.internet.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
        ip,
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
      const result = await teamProvisioner({
        name: faker.company.name(),
        subdomain,
        authenticationProvider,
        ip,
      });
      const { team, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(team.subdomain).toEqual(subdomain);
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
        const subdomain = faker.internet.domainWord();
        await teamProvisioner({
          teamId: exampleTeam.id,
          name: "name",
          subdomain,
          authenticationProvider: {
            name: "google",
            providerId: `${subdomain}.com`,
          },
          ip,
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
      const { team, isNewTeam } = await teamProvisioner({
        name: "Test team",
        subdomain,
        avatarUrl: faker.internet.avatar(),
        authenticationProvider: {
          name: "google",
          providerId: `${subdomain}.com`,
        },
        ip,
      });

      expect(isNewTeam).toBeTruthy();
      expect(team.name).toEqual("Test team");
    });

    it("should not allow creating multiple teams in installation", async () => {
      const team = await buildTeam();
      const subdomain = faker.internet.domainWord();
      let error;

      try {
        await teamProvisioner({
          name: "Test team",
          subdomain,
          avatarUrl: faker.internet.avatar(),
          teamId: team.id,
          authenticationProvider: {
            name: "google",
            providerId: `${subdomain}.com`,
          },
          ip,
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
      const result = await teamProvisioner({
        name: "Updated name",
        subdomain: faker.internet.domainWord(),
        domain,
        teamId: existing.id,
        authenticationProvider: {
          name: "google",
          providerId: domain,
        },
        ip,
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
        await teamProvisioner({
          name: "Updated name",
          subdomain: faker.internet.domainWord(),
          domain: otherDomain,
          teamId: existing.id,
          authenticationProvider: {
            name: "google",
            providerId: otherDomain,
          },
          ip,
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
      const result = await teamProvisioner({
        name: "Updated name",
        subdomain,
        authenticationProvider,
        ip,
      });
      const { team, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(team.subdomain).toEqual(subdomain);
      expect(isNewTeam).toEqual(false);
    });
  });
});
