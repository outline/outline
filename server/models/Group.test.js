/* eslint-disable flowtype/require-valid-file-annotation */
import { CollectionGroup, GroupUser } from "../models";
import { buildUser, buildGroup, buildCollection } from "../test/factories";
import { flushdb } from "../test/support";

beforeEach(() => flushdb());
beforeEach(jest.resetAllMocks);

describe("afterDestroy hook", () => {
  test("should destroy associated group and collection join relations", async () => {
    const group = await buildGroup();
    const teamId = group.teamId;

    const user1 = await buildUser({ teamId });
    const user2 = await buildUser({ teamId });

    const collection1 = await buildCollection({
      private: true,
      teamId,
    });
    const collection2 = await buildCollection({
      private: true,
      teamId,
    });

    const createdById = user1.id;

    await group.addUser(user1, { through: { createdById } });
    await group.addUser(user2, { through: { createdById } });

    await collection1.addGroup(group, { through: { createdById } });
    await collection2.addGroup(group, { through: { createdById } });

    let collectionGroupCount = await CollectionGroup.count();
    let groupUserCount = await GroupUser.count();

    expect(collectionGroupCount).toBe(2);
    expect(groupUserCount).toBe(2);

    await group.destroy();

    collectionGroupCount = await CollectionGroup.count();
    groupUserCount = await GroupUser.count();

    expect(collectionGroupCount).toBe(0);
    expect(groupUserCount).toBe(0);
  });
});
