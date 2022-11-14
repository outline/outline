import env from "@server/env";
import TeamDomain from "@server/models/TeamDomain";
import { buildTeam, buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import teamProvisioner from "./teamProvisioner";

setupTestDatabase();

describe("teamProvisioner", () => {
  const ip = "127.0.0.1";

  describe("hosted", () => {
    beforeEach(() => {
      env.DEPLOYMENT = "hosted";
    });

    it("should create team and authentication provider", async () => {
      const result = await teamProvisioner({
        name: "Test team",
        subdomain: "example",
        avatarUrl: "http://example.com/logo.png",
        authenticationProvider: {
          name: "google",
          providerId: "example.com",
        },
        ip,
      });
      const { team, authenticationProvider, isNewTeam } = result;
      expect(authenticationProvider.name).toEqual("google");
      expect(authenticationProvider.providerId).toEqual("example.com");
      expect(team.name).toEqual("Test team");
      expect(team.subdomain).toEqual("example");
      expect(isNewTeam).toEqual(true);
    });

    it("should set subdomain append if unavailable", async () => {
      await buildTeam({
        subdomain: "myteam",
      });

      const result = await teamProvisioner({
        name: "Test team",
        subdomain: "myteam",
        avatarUrl: "http://example.com/logo.png",
        authenticationProvider: {
          name: "google",
          providerId: "example.com",
        },
        ip,
      });

      expect(result.isNewTeam).toEqual(true);
      expect(result.team.subdomain).toEqual("myteam1");
    });

    it("should increment subdomain append if unavailable", async () => {
      await buildTeam({
        subdomain: "myteam",
      });
      await buildTeam({
        subdomain: "myteam1",
      });
      const result = await teamProvisioner({
        name: "Test team",
        subdomain: "myteam",
        avatarUrl: "http://example.com/logo.png",
        authenticationProvider: {
          name: "google",
          providerId: "example.com",
        },
        ip,
      });

      expect(result.team.subdomain).toEqual("myteam2");
    });

    it("should return existing team", async () => {
      const authenticationProvider = {
        name: "google",
        providerId: "example.com",
      };
      const existing = await buildTeam({
        subdomain: "example",
        authenticationProviders: [authenticationProvider],
      });
      const result = await teamProvisioner({
        name: "Updated name",
        subdomain: "example",
        authenticationProvider,
        ip,
      });
      const { team, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(team.subdomain).toEqual("example");
      expect(isNewTeam).toEqual(false);
    });

    it("should error on mismatched team and authentication provider", async () => {
      const exampleTeam = await buildTeam({
        subdomain: "example",
        authenticationProviders: [
          {
            name: "google",
            providerId: "example.com",
          },
        ],
      });

      let error;
      try {
        await teamProvisioner({
          teamId: exampleTeam.id,
          name: "name",
          subdomain: "other",
          authenticationProvider: {
            name: "google",
            providerId: "other.com",
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
    beforeEach(() => {
      env.DEPLOYMENT = undefined;
    });

    it("should allow creating first team", async () => {
      const { team, isNewTeam } = await teamProvisioner({
        name: "Test team",
        subdomain: "example",
        avatarUrl: "http://example.com/logo.png",
        authenticationProvider: {
          name: "google",
          providerId: "example.com",
        },
        ip,
      });

      expect(isNewTeam).toBeTruthy();
      expect(team.name).toEqual("Test team");
    });

    it("should not allow creating multiple teams in installation", async () => {
      const team = await buildTeam();
      let error;

      try {
        await teamProvisioner({
          name: "Test team",
          subdomain: "example",
          avatarUrl: "http://example.com/logo.png",
          teamId: team.id,
          authenticationProvider: {
            name: "google",
            providerId: "example.com",
          },
          ip,
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeTruthy();
    });

    it("should return existing team when within allowed domains", async () => {
      const existing = await buildTeam();
      const user = await buildUser({
        teamId: existing.id,
      });
      await TeamDomain.create({
        teamId: existing.id,
        name: "allowed-domain.com",
        createdById: user.id,
      });
      const result = await teamProvisioner({
        name: "Updated name",
        subdomain: "example",
        domain: "allowed-domain.com",
        teamId: existing.id,
        authenticationProvider: {
          name: "google",
          providerId: "allowed-domain.com",
        },
        ip,
      });
      const { team, authenticationProvider, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(authenticationProvider.name).toEqual("google");
      expect(authenticationProvider.providerId).toEqual("allowed-domain.com");
      expect(isNewTeam).toEqual(false);
      const providers = await team.$get("authenticationProviders");
      expect(providers.length).toEqual(2);
    });

    it("should error when NOT within allowed domains", async () => {
      const existing = await buildTeam();
      const user = await buildUser({
        teamId: existing.id,
      });
      await TeamDomain.create({
        teamId: existing.id,
        name: "allowed-domain.com",
        createdById: user.id,
      });

      let error;
      try {
        await teamProvisioner({
          name: "Updated name",
          subdomain: "example",
          domain: "other-domain.com",
          teamId: existing.id,
          authenticationProvider: {
            name: "google",
            providerId: "other-domain.com",
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
        providerId: "example.com",
      };
      const existing = await buildTeam({
        subdomain: "example",
        authenticationProviders: [authenticationProvider],
      });
      const result = await teamProvisioner({
        name: "Updated name",
        subdomain: "example",
        authenticationProvider,
        ip,
      });
      const { team, isNewTeam } = result;
      expect(team.id).toEqual(existing.id);
      expect(team.name).toEqual(existing.name);
      expect(team.subdomain).toEqual("example");
      expect(isNewTeam).toEqual(false);
    });
  });
});
