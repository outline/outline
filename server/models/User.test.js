// @flow
import { UserAuthentication, CollectionUser } from "../models";
import { buildUser, buildTeam, buildCollection } from "../test/factories";
import { flushdb } from "../test/support";

beforeEach(() => flushdb());

describe("user model", () => {
  describe("destroy", () => {
    it("should delete user authentications", async () => {
      const user = await buildUser();
      expect(await UserAuthentication.count()).toBe(1);

      await user.destroy();
      expect(await UserAuthentication.count()).toBe(0);
    });
  });

  describe("getJwtToken", () => {
    it("should set JWT secret", async () => {
      const user = await buildUser();
      expect(user.getJwtToken()).toBeTruthy();
    });
  });

  describe("collectionIds", () => {
    it("should return read_write collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: "read_write",
      });

      const response = await user.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });

    it("should return read collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: "read",
      });

      const response = await user.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });

    it("should not return private collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      await buildCollection({
        teamId: team.id,
        permission: null,
      });

      const response = await user.collectionIds();
      expect(response.length).toEqual(0);
    });

    it("should not return private collection with membership", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });

      await CollectionUser.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: "read",
      });

      const response = await user.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });
  });
});
