import { Document, DocumentTag, Tag } from "@server/models";
import presentDocument, { presentDocuments } from "@server/presenters/document";
import type { APIContext } from "@server/types";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import { sequelize } from "@server/storage/database";

type PresentedDocument = { id: string; tags: { name: string }[] };

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

  describe("tags", () => {
    it("should batch-load tags for many documents in a single query", async () => {
      const user = await buildUser();
      const collection = await buildCollection({ teamId: user.teamId });
      const tag = await Tag.create({ teamId: user.teamId, name: "batch-tag" });

      const documents: Document[] = [];
      for (let i = 0; i < 3; i++) {
        const built = await buildDocument({
          teamId: user.teamId,
          collectionId: collection.id,
        });
        await DocumentTag.create({ tagId: tag.id, documentId: built.id });
        // presentDocument needs the createdBy/updatedBy associations that
        // Document.create doesn't eagerly load.
        documents.push(
          await Document.findByPk(built.id, {
            userId: user.id,
            rejectOnEmpty: true,
          })
        );
      }

      const queries: string[] = [];
      const query = sequelize.query.bind(sequelize);
      const spy = vi
        .spyOn(sequelize, "query")
        .mockImplementation((sql, options) => {
          queries.push(typeof sql === "string" ? sql : sql.query);
          return query(sql, options);
        });

      let presented: PresentedDocument[];
      try {
        presented = (await presentDocuments(
          undefined,
          documents
        )) as unknown as PresentedDocument[];
      } finally {
        spy.mockRestore();
      }

      expect(
        queries.filter((sql) => /FROM "document_tags"/.test(sql)).length
      ).toEqual(1);
      expect(
        presented.every((doc) => doc.tags.some((t) => t.name === "batch-tag"))
      ).toBe(true);
    });

    it("should only include a document's own tags", async () => {
      const user = await buildUser();
      const tagA = await Tag.create({
        teamId: user.teamId,
        name: "own-tag-a",
      });
      const tagB = await Tag.create({
        teamId: user.teamId,
        name: "own-tag-b",
      });
      const builtA = await buildDocument({ teamId: user.teamId });
      const builtB = await buildDocument({ teamId: user.teamId });
      await DocumentTag.create({ tagId: tagA.id, documentId: builtA.id });
      await DocumentTag.create({ tagId: tagB.id, documentId: builtB.id });
      const documentA = await Document.findByPk(builtA.id, {
        userId: user.id,
        rejectOnEmpty: true,
      });
      const documentB = await Document.findByPk(builtB.id, {
        userId: user.id,
        rejectOnEmpty: true,
      });

      const presented = (await presentDocuments(undefined, [
        documentA,
        documentB,
      ])) as unknown as PresentedDocument[];
      const presentedA = presented.find((d) => d.id === documentA.id)!;
      const presentedB = presented.find((d) => d.id === documentB.id)!;

      expect(presentedA.tags.map((t) => t.name)).toEqual(["own-tag-a"]);
      expect(presentedB.tags.map((t) => t.name)).toEqual(["own-tag-b"]);
    });

    it("should order a document's tags by name", async () => {
      const user = await buildUser();
      const tagZ = await Tag.create({ teamId: user.teamId, name: "zulu" });
      const tagA = await Tag.create({ teamId: user.teamId, name: "alpha" });
      const built = await buildDocument({ teamId: user.teamId });
      // Created in an order that would not already sort correctly.
      await DocumentTag.create({ tagId: tagZ.id, documentId: built.id });
      await DocumentTag.create({ tagId: tagA.id, documentId: built.id });
      const document = await Document.findByPk(built.id, {
        userId: user.id,
        rejectOnEmpty: true,
      });

      const presented = (await presentDocuments(undefined, [
        document,
      ])) as unknown as PresentedDocument[];

      expect(presented[0].tags.map((t) => t.name)).toEqual(["alpha", "zulu"]);
    });

    it("should see tags written earlier in the same transaction", async () => {
      const user = await buildUser();
      const built = await buildDocument({ teamId: user.teamId });

      const presented = await withAPIContext(user, async (ctx) => {
        const document = await Document.findByPk(built.id, {
          userId: user.id,
          transaction: ctx.state.transaction,
          rejectOnEmpty: true,
        });
        const tag = await Tag.create(
          { teamId: user.teamId, name: "in-flight-tag" },
          { transaction: ctx.state.transaction }
        );
        await DocumentTag.create(
          { tagId: tag.id, documentId: document.id },
          { transaction: ctx.state.transaction }
        );

        // Not yet committed — only visible to a query on this same
        // transaction, which is exactly what documentDuplicator relies on
        // when presenting duplicates before the route's transaction commits.
        // `withAPIContext` builds a bare context without `headers`, which
        // presentDocument reads unconditionally, so fill it in here.
        return presentDocument({ ...ctx, headers: {} } as APIContext, document);
      });

      expect(
        (presented as unknown as PresentedDocument).tags.map((t) => t.name)
      ).toEqual(["in-flight-tag"]);
    });

    it("should not include tags for share-link responses", async () => {
      const user = await buildUser();
      const tag = await Tag.create({
        teamId: user.teamId,
        name: "hidden-tag",
      });
      const built = await buildDocument({ teamId: user.teamId });
      await DocumentTag.create({ tagId: tag.id, documentId: built.id });
      const document = await Document.findByPk(built.id, {
        userId: user.id,
        rejectOnEmpty: true,
      });

      const presented = await presentDocument(undefined, document, {
        shareId: "some-share-id",
      });

      expect(presented.tags).toBeUndefined();
    });
  });
});
