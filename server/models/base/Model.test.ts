import { faker } from "@faker-js/faker";
import { v4 as uuid } from "uuid";
import { TeamPreference } from "@shared/types";
import { buildDocument, buildTeam } from "@server/test/factories";
import User from "../User";

describe("Model", () => {
  describe("changeset", () => {
    it("should return attributes changed since last save", async () => {
      const team = await buildTeam({
        name: "Test Team",
      });
      team.name = "New Name";
      expect(Object.keys(team.changeset.attributes).length).toEqual(1);
      expect(Object.keys(team.changeset.previous).length).toEqual(1);
      expect(team.changeset.attributes.name).toEqual("New Name");
      expect(team.changeset.previous.name).toEqual("Test Team");

      await team.save();
      expect(team.changeset.attributes).toEqual({});
      expect(team.changeset.previous).toEqual({});
    });

    it("should return partial of objects", async () => {
      const team = await buildTeam();
      team.setPreference(TeamPreference.Commenting, false);
      expect(team.changeset.attributes.preferences).toEqual({
        commenting: false,
      });
      expect(team.changeset.previous.preferences).toEqual({});
    });

    it("should return boolean values", async () => {
      const team = await buildTeam({
        guestSignin: false,
      });
      team.guestSignin = true;
      expect(team.changeset.attributes.guestSignin).toEqual(true);
      expect(team.changeset.previous.guestSignin).toEqual(false);
    });

    it("should return full array if value changed", async () => {
      const collaboratorId = uuid();
      const document = await buildDocument();
      const prev = document.collaboratorIds;

      document.collaboratorIds = [...document.collaboratorIds, collaboratorId];
      expect(document.changeset.attributes.collaboratorIds).toEqual(
        document.collaboratorIds
      );
      expect(document.changeset.previous.collaboratorIds).toEqual(prev);
    });
  });

  describe("batch load", () => {
    it("should return data in batches", async () => {
      const team = await buildTeam();
      await User.bulkCreate(
        [...Array(105)].map(() => ({
          email: faker.internet.email().toLowerCase(),
          name: faker.person.fullName(),
          teamId: team.id,
        }))
      );

      const usersBatch: User[][] = [];

      await User.findAllInBatches<User>(
        { where: { teamId: team.id }, batchLimit: 100 },
        async (foundUsers) => void usersBatch.push(foundUsers)
      );

      expect(usersBatch.length).toEqual(2);
      expect(usersBatch[0].length).toEqual(100);
      expect(usersBatch[1].length).toEqual(5);
    });

    it("should return data in batches with total limit", async () => {
      const team = await buildTeam();
      await User.bulkCreate(
        [...Array(10)].map(() => ({
          email: faker.internet.email().toLowerCase(),
          name: faker.person.fullName(),
          teamId: team.id,
        }))
      );

      const usersBatch: User[][] = [];

      await User.findAllInBatches<User>(
        { where: { teamId: team.id }, batchLimit: 2, totalLimit: 4 },
        async (foundUsers) => void usersBatch.push(foundUsers)
      );

      expect(usersBatch.length).toEqual(2);
      expect(usersBatch[0].length).toEqual(2);
      expect(usersBatch[1].length).toEqual(2);
    });
  });
});
