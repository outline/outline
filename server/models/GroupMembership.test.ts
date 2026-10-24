import { CollectionPermission } from "@shared/types";
import { sleep } from "@shared/utils/timers";
import { sequelize } from "@server/storage/database";
import {
  buildCollection,
  buildDocument,
  buildGroup,
  buildUser,
} from "@server/test/factories";
import GroupMembership from "./GroupMembership";

describe("GroupMembership", () => {
  describe("withCollection scope", () => {
    it("should return the collection", async () => {
      const collection = await buildCollection();
      const group = await buildGroup();
      const user = await buildUser({ teamId: group.teamId });

      await GroupMembership.create({
        createdById: user.id,
        groupId: group.id,
        collectionId: collection.id,
      });

      const permission = await GroupMembership.scope("withCollection").findOne({
        where: {
          groupId: group.id,
          collectionId: collection.id,
        },
      });

      expect(permission).toBeDefined();
      expect(permission?.collection).toBeDefined();
      expect(permission?.collection?.id).toEqual(collection.id);
    });
  });

  describe("findOneForUpdate", () => {
    it("should create one membership for concurrent grants", async () => {
      const document = await buildDocument();
      const group = await buildGroup({ teamId: document.teamId });

      const grant = (permission: CollectionPermission, ids: string[]) =>
        sequelize.transaction(async (transaction) => {
          const [documentId, groupId] = ids;
          const membership = await GroupMembership.findOneForUpdate(
            { documentId, groupId },
            { transaction }
          );
          await sleep(50);

          if (membership) {
            membership.permission = permission;
            return membership.save({ transaction });
          }

          return GroupMembership.create(
            {
              documentId,
              groupId,
              permission,
              createdById: document.createdById,
            },
            { transaction }
          );
        });

      await Promise.all([
        grant(CollectionPermission.Read, [document.id, group.id]),
        grant(CollectionPermission.ReadWrite, [
          document.id.toUpperCase(),
          group.id.toUpperCase(),
        ]),
      ]);

      const memberships = await GroupMembership.findAll({
        where: { documentId: document.id, groupId: group.id },
      });
      expect(memberships).toHaveLength(1);
    });
  });
});
