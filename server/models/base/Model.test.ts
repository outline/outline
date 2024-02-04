import { v4 as uuid } from "uuid";
import { TeamPreference } from "@shared/types";
import { buildDocument, buildTeam } from "@server/test/factories";

describe("Model", () => {
  describe("changeset", () => {
    it("should return attributes changed since last save", async () => {
      const team = await buildTeam({
        name: "Test Team",
      });
      team.name = "New Name";
      expect(Object.keys(team.changeset.attributes).length).toEqual(1);
      expect(Object.keys(team.changeset.previousAttributes).length).toEqual(1);
      expect(team.changeset.attributes.name).toEqual("New Name");
      expect(team.changeset.previousAttributes.name).toEqual("Test Team");

      await team.save();
      expect(team.changeset.attributes).toEqual({});
      expect(team.changeset.previousAttributes).toEqual({});
    });

    it("should return partial of objects", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.Commenting, false);
      expect(team.changeset.attributes.preferences).toEqual({
        commenting: false,
      });
      expect(team.changeset.previousAttributes.preferences).toEqual({});
    });

    it("should return boolean values", async () => {
      const team = await buildTeam({
        guestSignin: false,
      });
      team.guestSignin = true;
      expect(team.changeset.attributes.guestSignin).toEqual(true);
      expect(team.changeset.previousAttributes.guestSignin).toEqual(false);
    });

    it("should return full array if changed", async () => {
      const collaboratorId = uuid();
      const document = await buildDocument();
      const prev = document.collaboratorIds;

      document.collaboratorIds = [...document.collaboratorIds, collaboratorId];
      expect(document.changeset.attributes.collaboratorIds).toEqual(
        document.collaboratorIds
      );
      expect(document.changeset.previousAttributes.collaboratorIds).toEqual(
        prev
      );
    });
  });
});
