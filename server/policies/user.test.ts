import { TeamPreference, EmailDisplay, UserRole } from "@shared/types";
import {
  buildUser,
  buildTeam,
  buildAdmin,
  buildViewer,
} from "@server/test/factories";
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

    it("should allow members to read other members' emails when emailDisplay is 'everyone'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.Everyone);
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

    it("should NOT allow guest users to read other users' emails when emailDisplay is 'none'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.None);
      await team.save();

      const guest = await buildUser({
        teamId: team.id,
        role: UserRole.Guest,
      });
      const user = await buildUser({
        teamId: team.id,
      });

      const abilities = serialize(guest, user);
      expect(abilities.readEmail).toBeFalsy();
    });

    it("should allow guest users to read their own email", async () => {
      const team = await buildTeam();
      const guest = await buildUser({
        teamId: team.id,
        role: UserRole.Guest,
      });

      const abilities = serialize(guest, guest);
      expect(abilities.readEmail).toBeTruthy();
    });

    it("should NOT allow viewer users to read other users' emails when emailDisplay is 'members'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.Members);
      await team.save();

      const viewer = await buildViewer({
        teamId: team.id,
      });
      const user = await buildUser({
        teamId: team.id,
      });

      const abilities = serialize(viewer, user);
      expect(abilities.readEmail).toBeFalsy();
    });

    it("should NOT allow viewer users to read other users' emails when emailDisplay is 'none'", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.EmailDisplay, EmailDisplay.None);
      await team.save();

      const viewer = await buildViewer({
        teamId: team.id,
      });
      const user = await buildUser({
        teamId: team.id,
      });

      const abilities = serialize(viewer, user);
      expect(abilities.readEmail).toBeFalsy();
    });

    it("should NOT allow users from different teams to read each other's emails", async () => {
      const team1 = await buildTeam();
      const team2 = await buildTeam();

      const user1 = await buildUser({
        teamId: team1.id,
      });
      const user2 = await buildUser({
        teamId: team2.id,
      });

      // Reload to ensure team is loaded
      await user1.reload({ include: [{ association: "team" }] });

      const abilities = serialize(user1, user2);
      expect(abilities.readEmail).toBeFalsy();
    });
  });
});
