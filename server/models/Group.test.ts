import { buildUser, buildGroup, buildCollection } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import CollectionGroup from "./CollectionGroup";
import GroupUser from "./GroupUser";

setupTestDatabase();

beforeEach(async () => {
  jest.resetAllMocks();
});

describe("afterDestroy hook", () => {
  test("should destroy associated group and collection join relations", async () => {
    const group = await buildGroup();
    const teamId = group.teamId;
    const user1 = await buildUser({
      teamId,
    });
    const user2 = await buildUser({
      teamId,
    });
    const collection1 = await buildCollection({
      permission: null,
      teamId,
    });
    const collection2 = await buildCollection({
      permission: null,
      teamId,
    });
    const createdById = user1.id;
    await group.$add("user", user1, {
      through: {
        createdById,
      },
    });
    await group.$add("user", user2, {
      through: {
        createdById,
      },
    });
    await collection1.$add("group", group, {
      through: {
        createdById,
      },
    });
    await collection2.$add("group", group, {
      through: {
        createdById,
      },
    });
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
