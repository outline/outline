import { TeamPreference } from "@shared/types";
import {
  buildAdmin,
  buildMetadataDocumentOAuthClient,
  buildOAuthClient,
  buildTeam,
  buildUser,
} from "@server/test/factories";
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

    it("should allow any user to read a metadata document client", async () => {
      const user = await buildUser();
      const oauthClient = await buildMetadataDocumentOAuthClient();

      expect(can(user, "read", oauthClient)).toBeTruthy();
    });

    it("should not allow reading a metadata document client when MCP is disabled", async () => {
      const team = await buildTeam({
        preferences: { [TeamPreference.MCP]: false },
      });
      const user = await buildUser({ teamId: team.id });
      const oauthClient = await buildMetadataDocumentOAuthClient();

      expect(can(user, "read", oauthClient)).toBeFalsy();
    });
  });

  describe("update and delete", () => {
    it("should allow an admin to update a user created client", async () => {
      const admin = await buildAdmin();
      const oauthClient = await buildOAuthClient({ teamId: admin.teamId });

      expect(can(admin, "update", oauthClient)).toBeTruthy();
      expect(can(admin, "delete", oauthClient)).toBeTruthy();
    });

    it("should not allow an admin to update a metadata document client", async () => {
      const admin = await buildAdmin();
      const oauthClient = await buildMetadataDocumentOAuthClient();

      expect(can(admin, "update", oauthClient)).toBeFalsy();
      expect(can(admin, "delete", oauthClient)).toBeFalsy();
    });
  });
});
