import { TeamPreference } from "@shared/types";
import { buildOAuthClient, buildTeam, buildUser } from "@server/test/factories";
import { can } from "./index";

describe("policies/oauthClient", () => {
  describe("read", () => {
    it("should allow reading a client in the same team", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const oauthClient = await buildOAuthClient({ teamId: team.id });

      expect(can(user, "read", oauthClient)).toBeTruthy();
    });

    it("should not allow reading a dynamically registered client when MCP is disabled", async () => {
      const team = await buildTeam({
        preferences: { [TeamPreference.MCP]: false },
      });
      const user = await buildUser({ teamId: team.id });
      const oauthClient = await buildOAuthClient({
        teamId: team.id,
        createdById: null,
      });

      expect(can(user, "read", oauthClient)).toBeFalsy();
    });

    it("should allow reading a user created client when MCP is disabled", async () => {
      const team = await buildTeam({
        preferences: { [TeamPreference.MCP]: false },
      });
      const user = await buildUser({ teamId: team.id });
      const oauthClient = await buildOAuthClient({ teamId: team.id });

      expect(can(user, "read", oauthClient)).toBeTruthy();
    });

    it("should allow reading a dynamically registered client when MCP is enabled", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const oauthClient = await buildOAuthClient({
        teamId: team.id,
        createdById: null,
      });

      expect(can(user, "read", oauthClient)).toBeTruthy();
    });
  });
});
