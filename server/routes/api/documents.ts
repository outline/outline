import fs from "fs-extra";
import invariant from "invariant";
import Router from "koa-router";
import { Op, ScopeOptions, WhereOptions } from "sequelize";
import { subtractDate } from "@shared/utils/date";
import documentCreator from "@server/commands/documentCreator";
import documentImporter from "@server/commands/documentImporter";
import documentMover from "@server/commands/documentMover";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import documentUpdater from "@server/commands/documentUpdater";
import { sequelize } from "@server/database/sequelize";
import {
  NotFoundError,
  InvalidRequestError,
  AuthorizationError,
  AuthenticationError,
} from "@server/errors";
import auth from "@server/middlewares/authentication";
import {
  Backlink,
  Collection,
  Document,
  Event,
  Revision,
  SearchQuery,
  Share,
  Star,
  User,
  View,
  Team,
} from "@server/models";
import { authorize, cannot, can } from "@server/policies";
import {
  presentCollection,
  presentDocument,
  presentPolicies,
} from "@server/presenters";
import {
  assertUuid,
  assertSort,
  assertIn,
  assertPresent,
  assertPositiveInteger,
  assertNotEmpty,
} from "@server/validation";
import env from "../../env";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("documents.list", auth(), pagination(), async (ctx) => {
  let { sort = "updatedAt" } = ctx.body;
  const { template, backlinkDocumentId, parentDocumentId } = ctx.body;
  // collection and user are here for backwards compatibility
  const collectionId = ctx.body.collectionId || ctx.body.collection;
  const createdById = ctx.body.userId || ctx.body.user;
  let direction = ctx.body.direction;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  // always filter by the current team
  const { user } = ctx.state;
  let where: WhereOptions<Document> = {
    teamId: user.teamId,
    archivedAt: {
      [Op.is]: null,
    },
  };

  if (template) {
    where = { ...where, template: true };
  }

  // if a specific user is passed then add to filters. If the user doesn't
  // exist in the team then nothing will be returned, so no need to check auth
  if (createdById) {
    assertUuid(createdById, "user must be a UUID");
    where = { ...where, createdById };
  }

  let documentIds: string[] = [];

  // if a specific collection is passed then we need to check auth to view it
  if (collectionId) {
    assertUuid(collectionId, "collection must be a UUID");
    where = { ...where, collectionId };
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "read", collection);

    // index sort is special because it uses the order of the documents in the
    // collection.documentStructure rather than a database column
    if (sort === "index") {
      documentIds = (collection?.documentStructure || [])
        .map((node) => node.id)
        .slice(ctx.state.pagination.offset, ctx.state.pagination.limit);
      where = { ...where, id: documentIds };
    } // otherwise, filter by all collections the user has access to
  } else {
    const collectionIds = await user.collectionIds();
    where = { ...where, collectionId: collectionIds };
  }

  if (parentDocumentId) {
    assertUuid(parentDocumentId, "parentDocumentId must be a UUID");
    where = { ...where, parentDocumentId };
  }

  // Explicitly passing 'null' as the parentDocumentId allows listing documents
  // that have no parent document (aka they are at the root of the collection)
  if (parentDocumentId === null) {
    where = {
      ...where,
      parentDocumentId: {
        [Op.is]: null,
      },
    };
  }

  if (backlinkDocumentId) {
    assertUuid(backlinkDocumentId, "backlinkDocumentId must be a UUID");
    const backlinks = await Backlink.findAll({
      attributes: ["reverseDocumentId"],
      where: {
        documentId: backlinkDocumentId,
      },
    });
    where = {
      ...where,
      id: backlinks.map((backlink) => backlink.reverseDocumentId),
    };
  }

  if (sort === "index") {
    sort = "updatedAt";
  }

  assertSort(sort, Document);

  const documents = await Document.defaultScopeWithUser(user.id).findAll({
    where,
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  // index sort is special because it uses the order of the documents in the
  // collection.documentStructure rather than a database column
  if (documentIds.length) {
    documents.sort(
      (a, b) => documentIds.indexOf(a.id) - documentIds.indexOf(b.id)
    );
  }

  const data = await Promise.all(
    documents.map((document) => presentDocument(document))
  );
  const policies = presentPolicies(user, documents);
  ctx.body = {
    pagination: ctx.state.pagination,
    data,
    policies,
  };
});

router.post("documents.archived", auth(), pagination(), async (ctx) => {
  const { sort = "updatedAt" } = ctx.body;

  assertSort(sort, Document);
  let direction = ctx.body.direction;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  const { user } = ctx.state;
  const collectionIds = await user.collectionIds();
  const collectionScope: Readonly<ScopeOptions> = {
    method: ["withCollectionPermissions", user.id],
  };
  const viewScope: Readonly<ScopeOptions> = {
    method: ["withViews", user.id],
  };
  const documents = await Document.scope([
    "defaultScope",
    collectionScope,
    viewScope,
  ]).findAll({
    where: {
      teamId: user.teamId,
      collectionId: collectionIds,
      archivedAt: {
        [Op.ne]: null,
      },
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });
  const data = await Promise.all(
    documents.map((document) => presentDocument(document))
  );
  const policies = presentPolicies(user, documents);

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
    policies,
  };
});

router.post("documents.deleted", auth(), pagination(), async (ctx) => {
  const { sort = "deletedAt" } = ctx.body;

  assertSort(sort, Document);
  let direction = ctx.body.direction;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  const { user } = ctx.state;
  const collectionIds = await user.collectionIds({
    paranoid: false,
  });
  const collectionScope: Readonly<ScopeOptions> = {
    method: ["withCollectionPermissions", user.id],
  };
  const viewScope: Readonly<ScopeOptions> = {
    method: ["withViews", user.id],
  };
  const documents = await Document.scope([collectionScope, viewScope]).findAll({
    where: {
      teamId: user.teamId,
      collectionId: collectionIds,
      deletedAt: {
        [Op.ne]: null,
      },
    },
    include: [
      {
        model: User,
        as: "createdBy",
        paranoid: false,
      },
      {
        model: User,
        as: "updatedBy",
        paranoid: false,
      },
    ],
    paranoid: false,
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });
  const data = await Promise.all(
    documents.map((document) => presentDocument(document))
  );
  const policies = presentPolicies(user, documents);

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
    policies,
  };
});

router.post("documents.viewed", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "updatedAt" } = ctx.body;

  assertSort(sort, Document);
  if (direction !== "ASC") {
    direction = "DESC";
  }
  const { user } = ctx.state;
  const collectionIds = await user.collectionIds();
  const userId = user.id;
  const views = await View.findAll({
    where: {
      userId,
    },
    order: [[sort, direction]],
    include: [
      {
        model: Document,
        required: true,
        where: {
          collectionId: collectionIds,
        },
        include: [
          {
            model: Collection.scope({
              method: ["withMembership", userId],
            }),
            as: "collection",
          },
        ],
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });
  const documents = views.map((view) => {
    const document = view.document;
    document.views = [view];
    return document;
  });
  const data = await Promise.all(
    documents.map((document) => presentDocument(document))
  );
  const policies = presentPolicies(user, documents);

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
    policies,
  };
});

router.post("documents.drafts", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { collectionId, dateFilter, sort = "updatedAt" } = ctx.body;

  assertSort(sort, Document);
  if (direction !== "ASC") {
    direction = "DESC";
  }
  const { user } = ctx.state;

  if (collectionId) {
    assertUuid(collectionId, "collectionId must be a UUID");
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "read", collection);
  }

  const collectionIds = collectionId
    ? [collectionId]
    : await user.collectionIds();
  const where: WhereOptions<Document> = {
    createdById: user.id,
    collectionId: collectionIds,
    publishedAt: {
      [Op.is]: null,
    },
  };

  if (dateFilter) {
    assertIn(
      dateFilter,
      ["day", "week", "month", "year"],
      "dateFilter must be one of day,week,month,year"
    );
    where.updatedAt = {
      [Op.gte]: subtractDate(new Date(), dateFilter),
    };
  } else {
    delete where.updatedAt;
  }

  const collectionScope: Readonly<ScopeOptions> = {
    method: ["withCollectionPermissions", user.id],
  };
  const documents = await Document.scope([
    "defaultScope",
    collectionScope,
  ]).findAll({
    where,
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });
  const data = await Promise.all(
    documents.map((document) => presentDocument(document))
  );
  const policies = presentPolicies(user, documents);

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
    policies,
  };
});

async function loadDocument({
  id,
  shareId,
  user,
}: {
  id?: string;
  shareId?: string;
  user?: User;
}): Promise<{
  document: Document;
  share?: Share;
  collection: Collection;
}> {
  let document;
  let collection;
  let share;

  if (!shareId && !(id && user)) {
    throw AuthenticationError(`Authentication or shareId required`);
  }

  if (shareId) {
    share = await Share.findOne({
      where: {
        revokedAt: {
          [Op.is]: null,
        },
        id: shareId,
      },
      include: [
        {
          // unscoping here allows us to return unpublished documents
          model: Document.unscoped(),
          include: [
            {
              model: User,
              as: "createdBy",
              paranoid: false,
            },
            {
              model: User,
              as: "updatedBy",
              paranoid: false,
            },
          ],
          required: true,
          as: "document",
        },
      ],
    });

    if (!share || share.document.archivedAt) {
      throw InvalidRequestError("Document could not be found for shareId");
    }

    // It is possible to pass both an id and a shareId to the documents.info
    // endpoint. In this case we'll load the document based on the `id` and check
    // if the provided share token allows access. This is used by the frontend
    // to navigate nested documents from a single share link.
    if (id) {
      document = await Document.findByPk(id, {
        userId: user ? user.id : undefined,
        paranoid: false,
      }); // otherwise, if the user has an authenticated session make sure to load
      // with their details so that we can return the correct policies, they may
      // be able to edit the shared document
    } else if (user) {
      document = await Document.findByPk(share.documentId, {
        userId: user.id,
        paranoid: false,
      });
    } else {
      document = share.document;
    }

    invariant(document, "document not found");

    // If the user has access to read the document, we can just update
    // the last access date and return the document without additional checks.
    const canReadDocument = user && can(user, "read", document);

    if (canReadDocument) {
      await share.update({
        lastAccessedAt: new Date(),
      });

      // Cannot use document.collection here as it does not include the
      // documentStructure by default through the relationship.
      collection = await Collection.findByPk(document.collectionId);
      invariant(collection, "collection not found");

      return {
        document,
        share,
        collection,
      };
    }

    // "published" === on the public internet.
    // We already know that there's either no logged in user or the user doesn't
    // have permission to read the document, so we can throw an error.
    if (!share.published) {
      throw AuthorizationError();
    }

    // It is possible to disable sharing at the collection so we must check
    collection = await Collection.findByPk(document.collectionId);
    invariant(collection, "collection not found");

    if (!collection.sharing) {
      throw AuthorizationError();
    }

    // If we're attempting to load a document that isn't the document originally
    // shared then includeChildDocuments must be enabled and the document must
    // still be active and nested within the shared document
    if (share.document.id !== document.id) {
      if (!share.includeChildDocuments) {
        throw AuthorizationError();
      }

      const childDocumentIds = await share.document.getChildDocumentIds({
        archivedAt: {
          [Op.is]: null,
        },
      });
      if (!childDocumentIds.includes(document.id)) {
        throw AuthorizationError();
      }
    }

    // It is possible to disable sharing at the team level so we must check
    const team = await Team.findByPk(document.teamId);
    invariant(team, "team not found");

    if (!team.sharing) {
      throw AuthorizationError();
    }

    await share.update({
      lastAccessedAt: new Date(),
    });
  } else {
    document = await Document.findByPk(id as string, {
      userId: user ? user.id : undefined,
      paranoid: false,
    });

    if (!document) {
      throw NotFoundError();
    }

    if (document.deletedAt) {
      // don't send data if user cannot restore deleted doc
      user && authorize(user, "restore", document);
    } else {
      user && authorize(user, "read", document);
    }

    collection = document.collection;
  }

  return {
    document,
    share,
    collection,
  };
}

router.post(
  "documents.info",
  auth({
    required: false,
  }),
  async (ctx) => {
    const { id, shareId, apiVersion } = ctx.body;
    assertPresent(id || shareId, "id or shareId is required");
    const { user } = ctx.state;
    const { document, share, collection } = await loadDocument({
      id,
      shareId,
      user,
    });
    const isPublic = cannot(user, "read", document);
    const serializedDocument = await presentDocument(document, {
      isPublic,
    });
    // Passing apiVersion=2 has a single effect, to change the response payload to
    // include document and sharedTree keys.

    const data =
      apiVersion === 2
        ? {
            document: serializedDocument,
            sharedTree:
              share && share.includeChildDocuments
                ? collection.getDocumentTree(share.documentId)
                : undefined,
          }
        : serializedDocument;
    ctx.body = {
      data,
      policies: isPublic ? undefined : presentPolicies(user, [document]),
    };
  }
);

router.post(
  "documents.export",
  auth({
    required: false,
  }),
  async (ctx) => {
    const { id, shareId } = ctx.body;
    assertPresent(id || shareId, "id or shareId is required");
    const { user } = ctx.state;
    const { document } = await loadDocument({
      id,
      shareId,
      user,
    });
    ctx.body = {
      data: document.toMarkdown(),
    };
  }
);

router.post("documents.restore", auth(), async (ctx) => {
  const { id, collectionId, revisionId } = ctx.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state;
  const document = await Document.findByPk(id, {
    userId: user.id,
    paranoid: false,
  });

  if (!document) {
    throw NotFoundError();
  }

  // Passing collectionId allows restoring to a different collection than the
  // document was originally within
  if (collectionId) {
    assertUuid(collectionId, "collectionId must be a uuid");
    document.collectionId = collectionId;
  }

  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(document.collectionId);

  // if the collectionId was provided in the request and isn't valid then it will
  // be caught as a 403 on the authorize call below. Otherwise we're checking here
  // that the original collection still exists and advising to pass collectionId
  // if not.
  if (!collectionId) {
    assertPresent(collection, "collectionId is required");
  }

  authorize(user, "update", collection);

  if (document.deletedAt) {
    authorize(user, "restore", document);
    // restore a previously deleted document
    await document.unarchive(user.id);
    await Event.create({
      name: "documents.restore",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
      data: {
        title: document.title,
      },
      ip: ctx.request.ip,
    });
  } else if (document.archivedAt) {
    authorize(user, "unarchive", document);
    // restore a previously archived document
    await document.unarchive(user.id);
    await Event.create({
      name: "documents.unarchive",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
      data: {
        title: document.title,
      },
      ip: ctx.request.ip,
    });
  } else if (revisionId) {
    // restore a document to a specific revision
    authorize(user, "update", document);
    const revision = await Revision.findByPk(revisionId);

    authorize(document, "restore", revision);

    document.text = revision.text;
    document.title = revision.title;
    await document.save();
    await Event.create({
      name: "documents.restore",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
      data: {
        title: document.title,
      },
      ip: ctx.request.ip,
    });
  } else {
    assertPresent(revisionId, "revisionId is required");
  }

  ctx.body = {
    data: await presentDocument(document),
    policies: presentPolicies(user, [document]),
  };
});

router.post("documents.search_titles", auth(), pagination(), async (ctx) => {
  const { query } = ctx.body;
  const { offset, limit } = ctx.state.pagination;
  const { user } = ctx.state;

  assertPresent(query, "query is required");
  const collectionIds = await user.collectionIds();
  const documents = await Document.scope([
    {
      method: ["withViews", user.id],
    },
    {
      method: ["withCollectionPermissions", user.id],
    },
  ]).findAll({
    where: {
      title: {
        [Op.iLike]: `%${query}%`,
      },
      collectionId: collectionIds,
      archivedAt: {
        [Op.is]: null,
      },
    },
    order: [["updatedAt", "DESC"]],
    include: [
      {
        model: User,
        as: "createdBy",
        paranoid: false,
      },
      {
        model: User,
        as: "updatedBy",
        paranoid: false,
      },
    ],
    offset,
    limit,
  });
  const policies = presentPolicies(user, documents);
  const data = await Promise.all(
    documents.map((document) => presentDocument(document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
    policies,
  };
});

router.post(
  "documents.search",
  auth({
    required: false,
  }),
  pagination(),
  async (ctx) => {
    const {
      query,
      includeArchived,
      includeDrafts,
      collectionId,
      userId,
      dateFilter,
      shareId,
    } = ctx.body;
    assertNotEmpty(query, "query is required");

    const { offset, limit } = ctx.state.pagination;
    const snippetMinWords = parseInt(ctx.body.snippetMinWords || 20, 10);
    const snippetMaxWords = parseInt(ctx.body.snippetMaxWords || 30, 10);

    // this typing is a bit ugly, would be better to use a type like ContextWithState
    // but that doesn't adequately handle cases when auth is optional
    const { user }: { user: User | undefined } = ctx.state;

    let teamId;
    let response;

    if (shareId) {
      const { share, document } = await loadDocument({
        shareId,
        user,
      });

      if (!share?.includeChildDocuments) {
        throw InvalidRequestError("Child documents cannot be searched");
      }

      teamId = share.teamId;
      const team = await Team.findByPk(teamId);
      invariant(team, "Share must belong to a team");

      response = await Document.searchForTeam(team, query, {
        includeArchived: includeArchived === "true",
        includeDrafts: includeDrafts === "true",
        collectionId: document.collectionId,
        share,
        dateFilter,
        offset,
        limit,
        snippetMinWords,
        snippetMaxWords,
      });
    } else {
      if (!user) {
        throw AuthenticationError("Authentication error");
      }

      teamId = user.teamId;

      if (collectionId) {
        assertUuid(collectionId, "collectionId must be a UUID");
        const collection = await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(collectionId);
        authorize(user, "read", collection);
      }

      let collaboratorIds = undefined;

      if (userId) {
        assertUuid(userId, "userId must be a UUID");
        collaboratorIds = [userId];
      }

      if (dateFilter) {
        assertIn(
          dateFilter,
          ["day", "week", "month", "year"],
          "dateFilter must be one of day,week,month,year"
        );
      }

      response = await Document.searchForUser(user, query, {
        includeArchived: includeArchived === "true",
        includeDrafts: includeDrafts === "true",
        collaboratorIds,
        collectionId,
        dateFilter,
        offset,
        limit,
        snippetMinWords,
        snippetMaxWords,
      });
    }

    const { results, totalCount } = response;
    const documents = results.map((result) => result.document);

    const data = await Promise.all(
      results.map(async (result) => {
        const document = await presentDocument(result.document);
        return { ...result, document };
      })
    );

    // When requesting subsequent pages of search results we don't want to record
    // duplicate search query records
    if (offset === 0) {
      SearchQuery.create({
        userId: user?.id,
        teamId,
        shareId,
        source: ctx.state.authType || "app", // we'll consider anything that isn't "api" to be "app"
        query,
        results: totalCount,
      });
    }

    ctx.body = {
      pagination: ctx.state.pagination,
      data,
      policies: user ? presentPolicies(user, documents) : null,
    };
  }
);

// Deprecated – use stars.create instead
router.post("documents.star", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state;

  const document = await Document.findByPk(id, {
    userId: user.id,
  });
  authorize(user, "read", document);

  await Star.findOrCreate({
    where: {
      documentId: document.id,
      userId: user.id,
    },
  });

  await Event.create({
    name: "documents.star",
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
    data: {
      title: document.title,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

// Deprecated – use stars.delete instead
router.post("documents.unstar", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state;

  const document = await Document.findByPk(id, {
    userId: user.id,
  });
  authorize(user, "read", document);

  await Star.destroy({
    where: {
      documentId: document.id,
      userId: user.id,
    },
  });
  await Event.create({
    name: "documents.unstar",
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
    data: {
      title: document.title,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

router.post("documents.templatize", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state;

  const original = await Document.findByPk(id, {
    userId: user.id,
  });
  authorize(user, "update", original);

  const document = await Document.create({
    editorVersion: original.editorVersion,
    collectionId: original.collectionId,
    teamId: original.teamId,
    userId: user.id,
    publishedAt: new Date(),
    lastModifiedById: user.id,
    createdById: user.id,
    template: true,
    title: original.title,
    text: original.text,
  });
  await Event.create({
    name: "documents.create",
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
    data: {
      title: document.title,
      template: true,
    },
    ip: ctx.request.ip,
  });

  // reload to get all of the data needed to present (user, collection etc)
  const reloaded = await Document.findByPk(document.id, {
    userId: user.id,
  });
  invariant(reloaded, "document not found");

  ctx.body = {
    data: await presentDocument(reloaded),
    policies: presentPolicies(user, [reloaded]),
  };
});

router.post("documents.update", auth(), async (ctx) => {
  const {
    id,
    title,
    text,
    fullWidth,
    publish,
    lastRevision,
    templateId,
    append,
  } = ctx.body;
  const editorVersion = ctx.headers["x-editor-version"] as string | undefined;
  assertPresent(id, "id is required");
  if (append) {
    assertPresent(text, "Text is required while appending");
  }
  const { user } = ctx.state;

  let collection: Collection | null | undefined;

  const document = await sequelize.transaction(async (transaction) => {
    const document = await Document.findByPk(id, {
      userId: user.id,
      transaction,
    });
    authorize(user, "update", document);

    collection = document.collection;

    if (lastRevision && lastRevision !== document.revisionCount) {
      throw InvalidRequestError("Document has changed since last revision");
    }

    return documentUpdater({
      document,
      user,
      title,
      text,
      fullWidth,
      publish,
      append,
      templateId,
      editorVersion,
      transaction,
      ip: ctx.request.ip,
    });
  });

  invariant(collection, "collection not found");

  document.updatedBy = user;
  document.collection = collection;

  ctx.body = {
    data: await presentDocument(document),
    policies: presentPolicies(user, [document]),
  };
});

router.post("documents.move", auth(), async (ctx) => {
  const { id, collectionId, parentDocumentId, index } = ctx.body;
  assertUuid(id, "id must be a uuid");
  assertUuid(collectionId, "collectionId must be a uuid");

  if (parentDocumentId) {
    assertUuid(parentDocumentId, "parentDocumentId must be a uuid");
  }

  if (index) {
    assertPositiveInteger(index, "index must be a positive integer");
  }

  if (parentDocumentId === id) {
    throw InvalidRequestError(
      "Infinite loop detected, cannot nest a document inside itself"
    );
  }

  const { user } = ctx.state;
  const document = await Document.findByPk(id, {
    userId: user.id,
  });
  authorize(user, "move", document);

  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(collectionId);
  authorize(user, "update", collection);

  if (parentDocumentId) {
    const parent = await Document.findByPk(parentDocumentId, {
      userId: user.id,
    });
    authorize(user, "update", parent);
  }

  const {
    documents,
    collections,
    collectionChanged,
  } = await sequelize.transaction(async (transaction) =>
    documentMover({
      user,
      document,
      collectionId,
      parentDocumentId,
      index,
      ip: ctx.request.ip,
      transaction,
    })
  );

  ctx.body = {
    data: {
      documents: await Promise.all(
        documents.map((document) => presentDocument(document))
      ),
      collections: await Promise.all(
        collections.map((collection) => presentCollection(collection))
      ),
    },
    policies: collectionChanged ? presentPolicies(user, documents) : [],
  };
});

router.post("documents.archive", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state;

  const document = await Document.findByPk(id, {
    userId: user.id,
  });
  authorize(user, "archive", document);

  await document.archive(user.id);
  await Event.create({
    name: "documents.archive",
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
    data: {
      title: document.title,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: await presentDocument(document),
    policies: presentPolicies(user, [document]),
  };
});

router.post("documents.delete", auth(), async (ctx) => {
  const { id, permanent } = ctx.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state;

  if (permanent) {
    const document = await Document.findByPk(id, {
      userId: user.id,
      paranoid: false,
    });
    authorize(user, "permanentDelete", document);

    await Document.update(
      {
        parentDocumentId: null,
      },
      {
        where: {
          parentDocumentId: document.id,
        },
        paranoid: false,
      }
    );
    await documentPermanentDeleter([document]);
    await Event.create({
      name: "documents.permanent_delete",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
      data: {
        title: document.title,
      },
      ip: ctx.request.ip,
    });
  } else {
    const document = await Document.findByPk(id, {
      userId: user.id,
    });

    authorize(user, "delete", document);

    await document.delete(user.id);
    await Event.create({
      name: "documents.delete",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
      data: {
        title: document.title,
      },
      ip: ctx.request.ip,
    });
  }

  ctx.body = {
    success: true,
  };
});

router.post("documents.unpublish", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state;

  const document = await Document.findByPk(id, {
    userId: user.id,
  });
  authorize(user, "unpublish", document);

  const childDocumentIds = await document.getChildDocumentIds();
  if (childDocumentIds.length > 0) {
    throw InvalidRequestError("Cannot unpublish document with child documents");
  }

  await document.unpublish(user.id);
  await Event.create({
    name: "documents.unpublish",
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
    data: {
      title: document.title,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: await presentDocument(document),
    policies: presentPolicies(user, [document]),
  };
});

router.post("documents.import", auth(), async (ctx) => {
  const { publish, collectionId, parentDocumentId, index } = ctx.body;

  if (!ctx.is("multipart/form-data")) {
    throw InvalidRequestError("Request type must be multipart/form-data");
  }

  // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
  const file: any = Object.values(ctx.request.files)[0];
  assertPresent(file, "file is required");

  if (env.MAXIMUM_IMPORT_SIZE && file.size > env.MAXIMUM_IMPORT_SIZE) {
    throw InvalidRequestError("The selected file was too large to import");
  }

  assertUuid(collectionId, "collectionId must be an uuid");

  if (parentDocumentId) {
    assertUuid(parentDocumentId, "parentDocumentId must be an uuid");
  }

  if (index) {
    assertPositiveInteger(index, "index must be an integer (>=0)");
  }
  const { user } = ctx.state;
  authorize(user, "createDocument", user.team);

  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findOne({
    where: {
      id: collectionId,
      teamId: user.teamId,
    },
  });
  authorize(user, "publish", collection);
  let parentDocument;

  if (parentDocumentId) {
    parentDocument = await Document.findOne({
      where: {
        id: parentDocumentId,
        collectionId: collection.id,
      },
    });
    authorize(user, "read", parentDocument, {
      collection,
    });
  }

  const content = await fs.readFile(file.path);
  const document = await sequelize.transaction(async (transaction) => {
    const { text, title } = await documentImporter({
      user,
      fileName: file.name,
      mimeType: file.type,
      content,
      ip: ctx.request.ip,
      transaction,
    });

    return documentCreator({
      source: "import",
      title,
      text,
      publish,
      collectionId,
      parentDocumentId,
      index,
      user,
      ip: ctx.request.ip,
      transaction,
    });
  });

  document.collection = collection;

  return (ctx.body = {
    data: await presentDocument(document),
    policies: presentPolicies(user, [document]),
  });
});

router.post("documents.create", auth(), async (ctx) => {
  const {
    title = "",
    text = "",
    publish,
    collectionId,
    parentDocumentId,
    templateId,
    template,
    index,
  } = ctx.body;
  const editorVersion = ctx.headers["x-editor-version"] as string | undefined;
  assertUuid(collectionId, "collectionId must be an uuid");

  if (parentDocumentId) {
    assertUuid(parentDocumentId, "parentDocumentId must be an uuid");
  }

  if (index) {
    assertPositiveInteger(index, "index must be an integer (>=0)");
  }
  const { user } = ctx.state;
  authorize(user, "createDocument", user.team);

  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findOne({
    where: {
      id: collectionId,
      teamId: user.teamId,
    },
  });
  authorize(user, "publish", collection);

  let parentDocument;

  if (parentDocumentId) {
    parentDocument = await Document.findOne({
      where: {
        id: parentDocumentId,
        collectionId: collection.id,
      },
    });
    authorize(user, "read", parentDocument, {
      collection,
    });
  }

  let templateDocument: Document | null | undefined;

  if (templateId) {
    templateDocument = await Document.findByPk(templateId, {
      userId: user.id,
    });
    authorize(user, "read", templateDocument);
  }

  const document = await sequelize.transaction(async (transaction) => {
    return documentCreator({
      title,
      text,
      publish,
      collectionId,
      parentDocumentId,
      templateDocument,
      template,
      index,
      user,
      editorVersion,
      ip: ctx.request.ip,
      transaction,
    });
  });

  document.collection = collection;

  return (ctx.body = {
    data: await presentDocument(document),
    policies: presentPolicies(user, [document]),
  });
});

export default router;
