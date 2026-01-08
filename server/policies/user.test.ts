import { TeamPreference, EmailDisplay } from "@shared/types";
import { buildUser, buildTeam, buildAdmin } from "@server/test/factories";
import { serialize } from "./index";

describe("policies/user", () => {
  describe("readEmail", () => {
    it("should allow user to read their own email", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const abilities = serialize(user, user);
      expect(abilities.readEmail).toBeTruthy();
    });

    it("should allow admin to read other users' emails", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({
        teamId: team.id,
      });
      const user = await buildUser({
        teamId: team.id,
      });
      const abilities = serialize(admin, user);
      expect(abilities.readEmail).toBeTruthy();
    });

    it("should allow members to read other members' emails when emailDisplay is 'members' (default)", async () => {
      const team = await buildTeam();
      const user1 = await buildUser({
        teamId: team.id,
      });
      const user2 = await buildUser({
        teamId: team.id,
      });
      const abilities = serialize(user1, user2);
      expect(abilities.readEmail).toBeTruthy();
    });

    it("should allow members to read other members' emails when emailDisplay is explicitly 'members'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.Members);
      await team.save();

      const user1 = await buildUser({
        teamId: team.id,
      });
      const user2 = await buildUser({
        teamId: team.id,
      });
      
      // Reload to get fresh team with preferences
      await user1.reload({ include: [{ association: "team" }] });
      
      const abilities = serialize(user1, user2);
      expect(abilities.readEmail).toBeTruthy();
    });

    it("should NOT allow members to read other members' emails when emailDisplay is 'none'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.None);
      await team.save();

      const user1 = await buildUser({
        teamId: team.id,
      });
      const user2 = await buildUser({
        teamId: team.id,
      });
      
      // Reload to get fresh team with preferences
      await user1.reload({ include: [{ association: "team" }] });
      
      const abilities = serialize(user1, user2);
      expect(abilities.readEmail).toBeFalsy();
    });

    it("should allow user to read their own email even when emailDisplay is 'none'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.None);
      await team.save();

      const user = await buildUser({
        teamId: team.id,
      });
      
      // Reload to get fresh team with preferences
      await user.reload({ include: [{ association: "team" }] });
      
      const abilities = serialize(user, user);
      expect(abilities.readEmail).toBeTruthy();
    });

    it("should allow admin to read other users' emails even when emailDisplay is 'none'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.None);
      await team.save();

      const admin = await buildAdmin({
        teamId: team.id,
      });
      const user = await buildUser({
        teamId: team.id,
      });
      
      // Reload to get fresh team with preferences
      await admin.reload({ include: [{ association: "team" }] });
      
      const abilities = serialize(admin, user);
      expect(abilities.readEmail).toBeTruthy();
    });
  });
});
