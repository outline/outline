import { Document } from "@server/models";
import { presentDocuments } from "@server/presenters/document";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import { sequelize } from "@server/storage/database";

describe("presentDocuments", () => {
  describe("deletedBy", () => {
    it("should resolve the deleting user in a single query", async () => {
      const user = await buildUser();
      const collection = await buildCollection({ teamId: user.teamId });

      for (let i = 0; i < 3; i++) {
        const document = await buildDocument({
          teamId: user.teamId,
          collectionId: collection.id,
        });
        await withAPIContext(user, (ctx) => document.destroyWithCtx(ctx));
      }

      const documents = await Document.scope("withDrafts").findAll({
        where: { collectionId: collection.id },
        paranoid: false,
      });
      expect(documents.length).toEqual(3);

      const queries: string[] = [];
      const query = sequelize.query.bind(sequelize);
      const spy = vi
        .spyOn(sequelize, "query")
        .mockImplementation((sql, options) => {
          queries.push(typeof sql === "string" ? sql : sql.query);
          return query(sql, options);
        });

      try {
        await presentDocuments(undefined, documents);
      } finally {
        spy.mockRestore();
      }

      expect(documents.every((doc) => doc.deletedBy?.id === user.id)).toBe(
        true
      );

      expect(queries.filter((sql) => /FROM "users"/.test(sql)).length).toEqual(
        1
      );
    });

    it("should not overwrite an already loaded deleting user", async () => {
      const userA = await buildUser();
      const userB = await buildUser({ teamId: userA.teamId });
      const collection = await buildCollection({ teamId: userA.teamId });

      const documentA = await buildDocument({
        teamId: userA.teamId,
        collectionId: collection.id,
      });
      const documentB = await buildDocument({
        teamId: userA.teamId,
        collectionId: collection.id,
      });
      await withAPIContext(userA, (ctx) => documentA.destroyWithCtx(ctx));
      await withAPIContext(userB, (ctx) => documentB.destroyWithCtx(ctx));

      // One document arrives with the association loaded, the other without.
      const loaded = await Document.scope("withDrafts").findOne({
        where: { id: documentA.id },
        include: [{ association: "deletedBy", paranoid: false }],
        paranoid: false,
        rejectOnEmpty: true,
      });
      const unloaded = await Document.scope("withDrafts").findOne({
        where: { id: documentB.id },
        paranoid: false,
        rejectOnEmpty: true,
      });

      await presentDocuments(undefined, [loaded, unloaded]);

      expect(loaded.deletedBy?.id).toEqual(userA.id);
      expect(unloaded.deletedBy?.id).toEqual(userB.id);
    });
  });
});
