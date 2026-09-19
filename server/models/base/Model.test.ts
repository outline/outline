import { faker } from "@faker-js/faker";
import { randomUUID } from "node:crypto";
import { CommentingAccess, TeamPreference } from "@shared/types";
import {
  buildDocument,
  buildSearchQuery,
  buildTeam,
} from "@server/test/factories";
import SearchQuery from "../SearchQuery";
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
      team.setPreference(TeamPreference.Commenting, CommentingAccess.None);
      expect(team.changeset.attributes.preferences).toEqual({
        commenting: CommentingAccess.None,
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
      const collaboratorId = randomUUID();
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

    it("should not skip records when the callback deletes them", async () => {
      const team = await buildTeam();
      await Promise.all(
        [...Array(5)].map(() => buildSearchQuery({ teamId: team.id }))
      );

      const total = await SearchQuery.findAllInBatches<SearchQuery>(
        {
          attributes: ["id"],
          where: { teamId: team.id },
          order: [["createdAt", "ASC"]],
          batchLimit: 2,
        },
        async (searchQueries) => {
          await SearchQuery.destroy({
            where: { id: searchQueries.map((searchQuery) => searchQuery.id) },
          });
        }
      );

      expect(total).toEqual(5);
      expect(await SearchQuery.count({ where: { teamId: team.id } })).toEqual(
        0
      );
    });

    it("should not skip or repeat records when ordering by a non-unique column", async () => {
      const team = await buildTeam();
      await User.bulkCreate(
        [...Array(10)].map(() => ({
          email: faker.internet.email().toLowerCase(),
          name: faker.person.fullName(),
          teamId: team.id,
        }))
      );

      const seen: string[] = [];

      await User.findAllInBatches<User>(
        {
          attributes: ["id"],
          where: { teamId: team.id },
          order: [["createdAt", "ASC"]],
          batchLimit: 3,
        },
        async (foundUsers) => {
          seen.push(...foundUsers.map((user) => user.id));
        }
      );

      expect(seen.length).toEqual(10);
      expect(new Set(seen).size).toEqual(10);
    });
  });
});
