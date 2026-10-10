import { buildGroup, buildGroupUser, buildUser } from "@server/test/factories";
import { FamiliarityHelper } from "./FamiliarityHelper";

describe("FamiliarityHelper", () => {
  describe("forUsers", () => {
    const buildSharedGroups = async (count: number) => {
      const actor = await buildUser();
      const other = await buildUser({ teamId: actor.teamId });

      const groupIds = [];
      for (let i = 0; i < count; i++) {
        const group = await buildGroup({ teamId: actor.teamId });
        await buildGroupUser({
          teamId: actor.teamId,
          groupId: group.id,
          userId: other.id,
        });
        groupIds.push(group.id);
      }

      return { other, groupIds };
    };

    it("should score a user for each group shared with the actor", async () => {
      const { other, groupIds } = await buildSharedGroups(2);

      const scores = await FamiliarityHelper.forUsers([other], groupIds);
      expect(scores[other.id]).toEqual(2);
    });

    it("should not score a user that shares no group with the actor", async () => {
      const { other } = await buildSharedGroups(1);

      const scores = await FamiliarityHelper.forUsers([other], []);
      expect(scores).toEqual({});
    });

    it("should cap the score of a user in many shared groups", async () => {
      const { other, groupIds } = await buildSharedGroups(6);

      const scores = await FamiliarityHelper.forUsers([other], groupIds);
      expect(scores[other.id]).toEqual(3);
    });
  });
});
