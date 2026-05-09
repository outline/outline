import { buildGroup, buildGroupUser, buildUser } from "@server/test/factories";

describe("Group", () => {
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
