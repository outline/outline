import { GroupUser } from "@server/models";
import { sequelize } from "@server/storage/database";
import { buildGroup, buildGroupUser, buildUser } from "@server/test/factories";

describe("Group", () => {
  describe("updatedAt", () => {
    const previousUpdatedAt = new Date("2020-01-01T00:00:00.000Z");

    it("updates when a user is added", async () => {
      const group = await buildGroup();
      await sequelize
        .getQueryInterface()
        .bulkUpdate(
          "groups",
          { updatedAt: previousUpdatedAt },
          { id: group.id },
          {}
        );

      await buildGroupUser({ groupId: group.id, teamId: group.teamId });

      await group.reload();
      expect(group.updatedAt.getTime()).toBeGreaterThan(
        previousUpdatedAt.getTime()
      );
    });

    it("updates when a user is removed by a bulk destroy", async () => {
      const group = await buildGroup();
      const groupUser = await buildGroupUser({
        groupId: group.id,
        teamId: group.teamId,
      });
      await sequelize
        .getQueryInterface()
        .bulkUpdate(
          "groups",
          { updatedAt: previousUpdatedAt },
          { id: group.id },
          {}
        );

      await GroupUser.destroy({
        where: { groupId: group.id, userId: groupUser.userId },
        individualHooks: true,
      });

      await group.reload();
      expect(group.updatedAt.getTime()).toBeGreaterThan(
        previousUpdatedAt.getTime()
      );
    });

    it("does not update when a membership creation is rolled back", async () => {
      const group = await buildGroup();
      const user = await buildUser({ teamId: group.teamId });
      await sequelize
        .getQueryInterface()
        .bulkUpdate(
          "groups",
          { updatedAt: previousUpdatedAt },
          { id: group.id },
          {}
        );

      await expect(
        sequelize.transaction(async (transaction) => {
          await GroupUser.create(
            {
              groupId: group.id,
              userId: user.id,
              createdById: user.id,
            },
            { transaction }
          );
          throw new Error("rollback");
        })
      ).rejects.toThrow("rollback");

      await group.reload();
      expect(group.updatedAt).toEqual(previousUpdatedAt);
      expect(
        await GroupUser.count({
          where: { groupId: group.id, userId: user.id },
        })
      ).toBe(0);
    });
  });

  describe("memberCount", () => {
    it("returns 0 for a group with no members", async () => {
      const group = await buildGroup();
      expect(await group.memberCount).toEqual(0);
    });

    it("counts active members", async () => {
      const group = await buildGroup();
      await buildGroupUser({ groupId: group.id, teamId: group.teamId });
      await buildGroupUser({ groupId: group.id, teamId: group.teamId });

      expect(await group.memberCount).toEqual(2);
    });

    it("excludes suspended members", async () => {
      const group = await buildGroup();
      await buildGroupUser({ groupId: group.id, teamId: group.teamId });

      const suspendedUser = await buildUser({
        teamId: group.teamId,
        suspendedAt: new Date(),
      });
      await buildGroupUser({
        groupId: group.id,
        teamId: group.teamId,
        userId: suspendedUser.id,
      });

      expect(await group.memberCount).toEqual(1);
    });

    it("excludes soft-deleted members", async () => {
      const group = await buildGroup();
      await buildGroupUser({ groupId: group.id, teamId: group.teamId });

      const deletedUser = await buildUser({ teamId: group.teamId });
      await buildGroupUser({
        groupId: group.id,
        teamId: group.teamId,
        userId: deletedUser.id,
      });
      await deletedUser.destroy();

      expect(await group.memberCount).toEqual(1);
    });

    it("invalidates the cached count when a member is suspended", async () => {
      const group = await buildGroup();
      const groupUser = await buildGroupUser({
        groupId: group.id,
        teamId: group.teamId,
      });
      await buildGroupUser({ groupId: group.id, teamId: group.teamId });

      // Prime the cache.
      expect(await group.memberCount).toEqual(2);

      const user = (await groupUser.$get("user"))!;
      await user.update({ suspendedAt: new Date() });

      expect(await group.memberCount).toEqual(1);
    });

    it("invalidates the cached count when a suspended member is restored", async () => {
      const group = await buildGroup();
      const suspendedUser = await buildUser({
        teamId: group.teamId,
        suspendedAt: new Date(),
      });
      await buildGroupUser({
        groupId: group.id,
        teamId: group.teamId,
        userId: suspendedUser.id,
      });
      await buildGroupUser({ groupId: group.id, teamId: group.teamId });

      // Prime the cache (suspended user is excluded).
      expect(await group.memberCount).toEqual(1);

      await suspendedUser.update({ suspendedAt: null });

      expect(await group.memberCount).toEqual(2);
    });
  });
});
