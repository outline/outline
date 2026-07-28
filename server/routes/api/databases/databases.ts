import Router from "koa-router";
import type { Property } from "@shared/types";
import { TeamPreference } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { validateDataViews } from "@shared/utils/properties";
import { DatabaseValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Collection, Database, Document } from "@server/models";
import { RelationHelper } from "@server/models/helpers/RelationHelper";
import { authorize } from "@server/policies";
import { presentDatabase, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

/** Rejects the request when document databases are not enabled for the team. */
function authorizeFeature(ctx: APIContext) {
  const { user } = ctx.state.auth;
  if (!user.team.getPreference(TeamPreference.DocumentDatabases)) {
    throw ValidationError("Document databases are currently disabled");
  }
}

router.post(
  "databases.list",
  auth(),
  validate(T.DatabasesListSchema),
  async (ctx: APIContext<T.DatabasesListReq>) => {
    const { collectionId } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorizeFeature(ctx);

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });
      authorize(user, "readDocument", collection);
    }

    // without a collection filter, only return databases in collections the
    // user can read — the plain association include is not user-scoped
    const collectionIds = collectionId
      ? [collectionId]
      : await user.collectionIds();

    const databases = await Database.findAll({
      where: {
        teamId: user.teamId,
        collectionId: collectionIds,
      },
      order: [["createdAt", "ASC"]],
    });

    // attach collections through the user scope so the presented policies
    // can see the user's membership of private collections
    const collections = await Collection.scope([
      "defaultScope",
      { method: ["withMembership", user.id] },
    ]).findAll({
      where: {
        id: Array.from(
          new Set(databases.map((database) => database.collectionId))
        ),
        teamId: user.teamId,
      },
    });
    const collectionById = new Map(
      collections.map((collection) => [collection.id, collection])
    );
    for (const database of databases) {
      const collection = collectionById.get(database.collectionId);
      if (collection) {
        database.collection = collection;
      }
    }

    ctx.body = {
      data: databases.map(presentDatabase),
      policies: presentPolicies(user, databases),
    };
  }
);

router.post(
  "databases.info",
  auth(),
  validate(T.DatabasesInfoSchema),
  async (ctx: APIContext<T.DatabasesInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorizeFeature(ctx);

    const database = await Database.findByPk(id);
    if (database) {
      database.collection = await Collection.findByPk(database.collectionId, {
        userId: user.id,
        rejectOnEmpty: true,
      });
    }
    authorize(user, "read", database);

    ctx.body = {
      data: presentDatabase(database),
      policies: presentPolicies(user, [database]),
    };
  }
);

router.post(
  "databases.create",
  auth(),
  validate(T.DatabasesCreateSchema),
  transaction(),
  async (ctx: APIContext<T.DatabasesCreateReq>) => {
    const { collectionId, name, icon, color, dataSchema } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    authorizeFeature(ctx);

    const collection = await Collection.findByPk(collectionId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "updateDocument", collection);

    const count = await Database.count({
      where: { collectionId },
      transaction,
    });
    if (count >= DatabaseValidation.maxPerCollection) {
      throw ValidationError(
        `A collection may contain at most ${DatabaseValidation.maxPerCollection} databases`
      );
    }

    const schema: Property[] = dataSchema ?? [];
    const database = await Database.create(
      {
        name: name || "Untitled database",
        icon: icon ?? null,
        color: color ?? null,
        dataSchema: schema,
        views: [Database.buildDefaultView(schema)],
        collectionId,
        teamId: user.teamId,
        createdById: user.id,
      },
      { transaction }
    );

    await RelationHelper.syncInverseProperties(database, [], { transaction });

    // the policies presented below need the collection, and it has to carry
    // the user's membership for private collections
    database.collection = collection;

    ctx.body = {
      data: presentDatabase(database),
      policies: presentPolicies(user, [database]),
    };
  }
);

router.post(
  "databases.update",
  auth(),
  validate(T.DatabasesUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.DatabasesUpdateReq>) => {
    const { id, name, icon, color, collectionId, dataSchema, views } =
      ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    authorizeFeature(ctx);

    const database = await Database.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (database) {
      database.collection = await Collection.findByPk(database.collectionId, {
        userId: user.id,
        transaction,
        rejectOnEmpty: true,
      });
    }
    authorize(user, "update", database);

    const previousSchema = database.dataSchema;

    if (name !== undefined) {
      database.name = name;
    }
    if (icon !== undefined) {
      database.icon = icon ?? null;
    }
    if (color !== undefined) {
      database.color = color ?? null;
    }
    if (dataSchema !== undefined) {
      database.dataSchema = dataSchema as Property[];
    }
    if (views !== undefined) {
      database.views = views;
    }

    // moving a database moves its rows with it, so that a row is always
    // readable by whoever can read the collection the database now lives in
    if (collectionId && collectionId !== database.collectionId) {
      const destination = await Collection.findByPk(collectionId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "updateDocument", destination);

      database.collectionId = collectionId;
      await Document.update(
        { collectionId },
        {
          where: { databaseId: database.id, teamId: user.teamId },
          transaction,
          hooks: false,
        }
      );
    }

    // views may only reference properties that exist in the schema
    try {
      validateDataViews(database.views, database.dataSchema);
    } catch (error) {
      throw ValidationError(errToString(error));
    }

    await database.save({ transaction });

    if (dataSchema !== undefined) {
      await RelationHelper.syncInverseProperties(database, previousSchema, {
        transaction,
      });
    }

    ctx.body = {
      data: presentDatabase(database),
      policies: presentPolicies(user, [database]),
    };
  }
);

router.post(
  "databases.delete",
  auth(),
  validate(T.DatabasesDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.DatabasesDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    authorizeFeature(ctx);

    const database = await Database.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (database) {
      database.collection = await Collection.findByPk(database.collectionId, {
        userId: user.id,
        transaction,
        rejectOnEmpty: true,
      });
    }
    authorize(user, "delete", database);

    // mirrors on other databases would otherwise point at a database that is
    // no longer there, so drop the schema first and let the sync remove them
    const previousSchema = database.dataSchema;
    database.dataSchema = [];
    await RelationHelper.syncInverseProperties(database, previousSchema, {
      transaction,
    });

    // rows outlive the database as ordinary documents. They were kept out of
    // the collection's document structure while the database owned them, so
    // they are put back into it here or they would be unreachable.
    const rows = await Document.findAll({
      where: { databaseId: database.id, teamId: user.teamId },
      transaction,
    });
    const collection = await Collection.findByPk(database.collectionId, {
      includeDocumentStructure: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const row of rows) {
      row.databaseId = null;
      row.properties = {};
      await row.save({ transaction, hooks: false, silent: true });

      if (collection && row.publishedAt && !row.deletedAt && !row.archivedAt) {
        await collection.addDocumentToStructure(row, undefined, {
          transaction,
          save: false,
        });
      }
    }
    if (collection) {
      await collection.save({ transaction });
    }

    await database.destroy({ transaction });

    ctx.body = { success: true };
  }
);

export default router;
