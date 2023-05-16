import fs from "fs-extra";
import invariant from "invariant";
import Router from "koa-router";
import mime from "mime-types";
import { Op, ScopeOptions, WhereOptions } from "sequelize";
import { TeamPreference } from "@shared/types";
import { subtractDate } from "@shared/utils/date";
import { bytesToHumanReadable } from "@shared/utils/files";
import documentCreator from "@server/commands/documentCreator";
import documentImporter from "@server/commands/documentImporter";
import documentLoader from "@server/commands/documentLoader";
import documentMover from "@server/commands/documentMover";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import documentUpdater from "@server/commands/documentUpdater";
import { sequelize } from "@server/database/sequelize";
import env from "@server/env";
import {
  NotFoundError,
  InvalidRequestError,
  AuthenticationError,
  ValidationError,
  IncorrectEditionError,
} from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import {
  Backlink,
  Collection,
  Document,
  Event,
  Revision,
  SearchQuery,
  User,
  View,
} from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import SearchHelper from "@server/models/helpers/SearchHelper";
import { authorize, cannot } from "@server/policies";
import {
  presentCollection,
  presentDocument,
  presentPolicies,
  presentPublicTeam,
  presentUser,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getFileFromRequest } from "@server/utils/koa";
import { getTeamFromContext } from "@server/utils/passport";
import slugify from "@server/utils/slugify";
import { assertPresent } from "@server/validation";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "documents.list",
  auth(),
  pagination(),
  validate(T.DocumentsListSchema),
  async (ctx: APIContext<T.DocumentsListReq>) => {
    let { sort } = ctx.input.body;
    const {
      direction,
      template,
      collectionId,
      backlinkDocumentId,
      parentDocumentId,
      userId: createdById,
    } = ctx.input.body;

    // always filter by the current team
    const { user } = ctx.state.auth;
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
      where = { ...where, createdById };
    }

    let documentIds: string[] = [];

    // if a specific collection is passed then we need to check auth to view it
    if (collectionId) {
      where = { ...where, collectionId };
      const collection = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collectionId);
      authorize(user, "readDocument", collection);

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
  }
);

router.post(
  "documents.archived",
  auth({ member: true }),
  pagination(),
  validate(T.DocumentsArchivedSchema),
  async (ctx: APIContext<T.DocumentsArchivedReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;
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
  }
);

router.post(
  "documents.deleted",
  auth({ member: true }),
  pagination(),
  validate(T.DocumentsDeletedSchema),
  async (ctx: APIContext<T.DocumentsDeletedReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;
    const collectionIds = await user.collectionIds({
      paranoid: false,
    });
    const collectionScope: Readonly<ScopeOptions> = {
      method: ["withCollectionPermissions", user.id],
    };
    const viewScope: Readonly<ScopeOptions> = {
      method: ["withViews", user.id],
    };
    const documents = await Document.scope([
      collectionScope,
      viewScope,
    ]).findAll({
      where: {
        teamId: user.teamId,
        collectionId: {
          [Op.or]: [{ [Op.in]: collectionIds }, { [Op.is]: null }],
        },
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
  }
);

router.post(
  "documents.viewed",
  auth(),
  pagination(),
  validate(T.DocumentsViewedSchema),
  async (ctx: APIContext<T.DocumentsViewedReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;
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
  }
);

router.post(
  "documents.drafts",
  auth(),
  pagination(),
  validate(T.DocumentsDraftsSchema),
  async (ctx: APIContext<T.DocumentsDraftsReq>) => {
    const { collectionId, dateFilter, direction, sort } = ctx.input.body;
    const { user } = ctx.state.auth;

    if (collectionId) {
      const collection = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collectionId);
      authorize(user, "readDocument", collection);
    }

    const collectionIds = collectionId
      ? [collectionId]
      : await user.collectionIds();
    const where: WhereOptions = {
      createdById: user.id,
      collectionId: {
        [Op.or]: [{ [Op.in]: collectionIds }, { [Op.is]: null }],
      },
      publishedAt: {
        [Op.is]: null,
      },
    };

    if (dateFilter) {
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
  }
);

router.post(
  "documents.info",
  auth({
    optional: true,
  }),
  validate(T.DocumentsInfoSchema),
  async (ctx: APIContext<T.DocumentsInfoReq>) => {
    const { id, shareId, apiVersion } = ctx.input.body;
    const { user } = ctx.state.auth;
    const teamFromCtx = await getTeamFromContext(ctx);
    const { document, share, collection } = await documentLoader({
      id,
      shareId,
      user,
      teamId: teamFromCtx?.id,
    });
    const isPublic = cannot(user, "read", document);
    const serializedDocument = await presentDocument(document, {
      isPublic,
    });

    const team = await document.$get("team");

    // Passing apiVersion=2 has a single effect, to change the response payload to
    // include top level keys for document, sharedTree, and team.
    const data =
      apiVersion === 2
        ? {
            document: serializedDocument,
            team: team?.getPreference(TeamPreference.PublicBranding)
              ? presentPublicTeam(team)
              : undefined,
            sharedTree:
              share && share.includeChildDocuments
                ? collection?.getDocumentTree(share.documentId)
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
  "documents.users",
  auth(),
  pagination(),
  validate(T.DocumentsUsersSchema),
  async (ctx: APIContext<T.DocumentsUsersReq>) => {
    const { id, query } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { offset, limit } = ctx.state.pagination;
    const document = await Document.findByPk(id, {
      userId: actor.id,
    });
    authorize(actor, "read", document);

    let users: User[] = [];
    let total = 0;
    let where: WhereOptions<User> = {
      teamId: document.teamId,
      suspendedAt: {
        [Op.is]: null,
      },
    };

    if (document.collectionId) {
      const collection = await document.$get("collection");

      if (!collection?.permission) {
        const memberIds = await Collection.membershipUserIds(
          document.collectionId
        );
        where = {
          ...where,
          id: {
            [Op.in]: memberIds,
          },
        };
      }

      if (query) {
        where = {
          ...where,
          name: {
            [Op.iLike]: `%${query}%`,
          },
        };
      }

      [users, total] = await Promise.all([
        User.findAll({ where, offset, limit }),
        User.count({ where }),
      ]);
    }

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: users.map((user) => presentUser(user)),
      policies: presentPolicies(actor, users),
    };
  }
);

router.post(
  "documents.export",
  rateLimiter(RateLimiterStrategy.FivePerMinute),
  auth({
    optional: true,
  }),
  validate(T.DocumentsExportSchema),
  async (ctx: APIContext<T.DocumentsExportReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const accept = ctx.request.headers["accept"];

    const { document } = await documentLoader({
      id,
      user,
      // We need the collaborative state to generate HTML.
      includeState: !accept?.includes("text/markdown"),
    });

    let contentType;
    let content;

    if (accept?.includes("text/html")) {
      contentType = "text/html";
      content = await DocumentHelper.toHTML(document, {
        signedUrls: true,
        centered: true,
      });
    } else if (accept?.includes("application/pdf")) {
      throw IncorrectEditionError(
        "PDF export is not available in the community edition"
      );
    } else if (accept?.includes("text/markdown")) {
      contentType = "text/markdown";
      content = DocumentHelper.toMarkdown(document);
    } else {
      contentType = "application/json";
      content = DocumentHelper.toMarkdown(document);
    }

    if (contentType !== "application/json") {
      // Override the extension for Markdown as it's incorrect in the mime-types
      // library until a new release > 2.1.35
      const extension =
        contentType === "text/markdown" ? "md" : mime.extension(contentType);

      ctx.set("Content-Type", contentType);
      ctx.set(
        "Content-Disposition",
        `attachment; filename="${slugify(
          document.titleWithDefault
        )}.${extension}"`
      );
      ctx.body = content;
      return;
    }

    ctx.body = {
      data: content,
    };
  }
);

router.post(
  "documents.restore",
  auth({ member: true }),
  validate(T.DocumentsRestoreSchema),
  async (ctx: APIContext<T.DocumentsRestoreReq>) => {
    const { id, collectionId, revisionId } = ctx.input.body;
    const { user } = ctx.state.auth;
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
      document.collectionId = collectionId;
    }

    const collection = document.collectionId
      ? await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(document.collectionId)
      : undefined;

    // if the collectionId was provided in the request and isn't valid then it will
    // be caught as a 403 on the authorize call below. Otherwise we're checking here
    // that the original collection still exists and advising to pass collectionId
    // if not.
    if (document.collection && !collectionId && !collection) {
      throw ValidationError(
        "Unable to restore to original collection, it may have been deleted"
      );
    }

    if (document.collection) {
      authorize(user, "updateDocument", collection);
    }

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
  }
);

router.post(
  "documents.search_titles",
  auth(),
  pagination(),
  validate(T.DocumentsSearchSchema),
  async (ctx: APIContext<T.DocumentsSearchReq>) => {
    const {
      query,
      includeArchived,
      includeDrafts,
      dateFilter,
      collectionId,
      userId,
    } = ctx.input.body;
    const { offset, limit } = ctx.state.pagination;
    const { user } = ctx.state.auth;
    let collaboratorIds = undefined;

    if (collectionId) {
      const collection = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collectionId);
      authorize(user, "readDocument", collection);
    }

    if (userId) {
      collaboratorIds = [userId];
    }

    const documents = await SearchHelper.searchTitlesForUser(user, query, {
      includeArchived,
      includeDrafts,
      dateFilter,
      collectionId,
      collaboratorIds,
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
  }
);

router.post(
  "documents.search",
  auth({
    optional: true,
  }),
  pagination(),
  validate(T.DocumentsSearchSchema),
  async (ctx: APIContext<T.DocumentsSearchReq>) => {
    const {
      query,
      includeArchived,
      includeDrafts,
      collectionId,
      userId,
      dateFilter,
      shareId,
      snippetMinWords,
      snippetMaxWords,
    } = ctx.input.body;
    const { offset, limit } = ctx.state.pagination;

    // Unfortunately, this still doesn't adequately handle cases when auth is optional
    const { user } = ctx.state.auth;

    let teamId;
    let response;

    if (shareId) {
      const teamFromCtx = await getTeamFromContext(ctx);
      const { share, document } = await documentLoader({
        teamId: teamFromCtx?.id,
        shareId,
        user,
      });

      if (!share?.includeChildDocuments) {
        throw InvalidRequestError("Child documents cannot be searched");
      }

      teamId = share.teamId;
      const team = await share.$get("team");
      invariant(team, "Share must belong to a team");

      response = await SearchHelper.searchForTeam(team, query, {
        includeArchived,
        includeDrafts,
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
        const collection = await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(collectionId);
        authorize(user, "readDocument", collection);
      }

      let collaboratorIds = undefined;

      if (userId) {
        collaboratorIds = [userId];
      }

      response = await SearchHelper.searchForUser(user, query, {
        includeArchived,
        includeDrafts,
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
        source: ctx.state.auth.type || "app", // we'll consider anything that isn't "api" to be "app"
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

router.post(
  "documents.templatize",
  auth({ member: true }),
  validate(T.DocumentsTemplatizeSchema),
  async (ctx: APIContext<T.DocumentsTemplatizeReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

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
  }
);

router.post(
  "documents.update",
  auth(),
  validate(T.DocumentsUpdateSchema),
  async (ctx: APIContext<T.DocumentsUpdateReq>) => {
    const {
      id,
      title,
      text,
      fullWidth,
      publish,
      templateId,
      collectionId,
      append,
      apiVersion,
    } = ctx.input.body;
    const editorVersion = ctx.headers["x-editor-version"] as string | undefined;
    const { user } = ctx.state.auth;
    let collection: Collection | null | undefined;

    const document = await Document.findByPk(id, {
      userId: user.id,
      includeState: true,
    });
    collection = document?.collection;
    authorize(user, "update", document);

    if (publish) {
      if (!document.collectionId) {
        assertPresent(
          collectionId,
          "collectionId is required to publish a draft without collection"
        );
        collection = await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(collectionId!);
      }
      authorize(user, "createDocument", collection);
    }

    collection = await sequelize.transaction(async (transaction) => {
      await documentUpdater({
        document,
        user,
        title,
        text,
        fullWidth,
        publish,
        collectionId,
        append,
        templateId,
        editorVersion,
        transaction,
        ip: ctx.request.ip,
      });

      if (!document.collectionId) {
        return null;
      }

      return await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(document.collectionId, { transaction });
    });

    document.updatedBy = user;
    document.collection = collection;

    ctx.body = {
      data:
        apiVersion === 2
          ? {
              document: await presentDocument(document),
              collection: collection
                ? presentCollection(collection)
                : undefined,
            }
          : await presentDocument(document),
      policies: presentPolicies(user, [document, collection]),
    };
  }
);

router.post(
  "documents.move",
  auth(),
  validate(T.DocumentsMoveSchema),
  async (ctx: APIContext<T.DocumentsMoveReq>) => {
    const { id, collectionId, parentDocumentId, index } = ctx.input.body;
    const { user } = ctx.state.auth;
    const document = await Document.findByPk(id, {
      userId: user.id,
    });
    authorize(user, "move", document);

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "updateDocument", collection);

    if (parentDocumentId) {
      const parent = await Document.findByPk(parentDocumentId, {
        userId: user.id,
      });
      authorize(user, "update", parent);

      if (!parent.publishedAt) {
        throw InvalidRequestError("Cannot move document inside a draft");
      }
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
  }
);

router.post(
  "documents.archive",
  auth(),
  validate(T.DocumentsArchiveSchema),
  async (ctx: APIContext<T.DocumentsArchiveReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

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
  }
);

router.post(
  "documents.delete",
  auth(),
  validate(T.DocumentsDeleteSchema),
  async (ctx: APIContext<T.DocumentsDeleteReq>) => {
    const { id, permanent } = ctx.input.body;
    const { user } = ctx.state.auth;

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
  }
);

router.post(
  "documents.unpublish",
  auth(),
  validate(T.DocumentsUnpublishSchema),
  async (ctx: APIContext<T.DocumentsUnpublishReq>) => {
    const { id, apiVersion } = ctx.input.body;
    const { user } = ctx.state.auth;

    const document = await Document.findByPk(id, {
      userId: user.id,
    });
    authorize(user, "unpublish", document);

    const childDocumentIds = await document.getChildDocumentIds();
    if (childDocumentIds.length > 0) {
      throw InvalidRequestError(
        "Cannot unpublish document with child documents"
      );
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
      data:
        apiVersion === 2
          ? {
              document: await presentDocument(document),
              collection: document.collection
                ? presentCollection(document.collection)
                : undefined,
            }
          : await presentDocument(document),
      policies: presentPolicies(user, [document]),
    };
  }
);

router.post(
  "documents.import",
  auth(),
  validate(T.DocumentsImportSchema),
  async (ctx: APIContext<T.DocumentsImportReq>) => {
    if (!ctx.is("multipart/form-data")) {
      throw InvalidRequestError("Request type must be multipart/form-data");
    }

    const { collectionId, parentDocumentId, publish } = ctx.input.body;

    const file = getFileFromRequest(ctx.request);
    if (!file) {
      throw InvalidRequestError("Request must include a file parameter");
    }

    if (env.MAXIMUM_IMPORT_SIZE && file.size > env.MAXIMUM_IMPORT_SIZE) {
      throw InvalidRequestError(
        `The selected file was larger than the ${bytesToHumanReadable(
          env.MAXIMUM_IMPORT_SIZE
        )} maximum size`
      );
    }

    const { user } = ctx.state.auth;

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findOne({
      where: {
        id: collectionId,
        teamId: user.teamId,
      },
    });
    authorize(user, "createDocument", collection);
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

    const content = await fs.readFile(file.filepath);
    const document = await sequelize.transaction(async (transaction) => {
      const { text, title } = await documentImporter({
        user,
        fileName: file.originalFilename ?? file.newFilename,
        mimeType: file.mimetype ?? "",
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
  }
);

router.post(
  "documents.create",
  auth(),
  validate(T.DocumentsCreateSchema),
  async (ctx: APIContext<T.DocumentsCreateReq>) => {
    const {
      title = "",
      text = "",
      publish,
      collectionId,
      parentDocumentId,
      templateId,
      template,
    } = ctx.input.body;
    const editorVersion = ctx.headers["x-editor-version"] as string | undefined;

    const { user } = ctx.state.auth;

    let collection;

    if (collectionId) {
      collection = await Collection.scope({
        method: ["withMembership", user.id],
      }).findOne({
        where: {
          id: collectionId,
          teamId: user.teamId,
        },
      });
      authorize(user, "createDocument", collection);
    }

    let parentDocument;

    if (parentDocumentId) {
      parentDocument = await Document.findOne({
        where: {
          id: parentDocumentId,
          collectionId: collection?.id,
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

    const document = await sequelize.transaction(async (transaction) =>
      documentCreator({
        title,
        text,
        publish,
        collectionId,
        parentDocumentId,
        templateDocument,
        template,
        user,
        editorVersion,
        ip: ctx.request.ip,
        transaction,
      })
    );

    document.collection = collection;

    return (ctx.body = {
      data: await presentDocument(document),
      policies: presentPolicies(user, [document]),
    });
  }
);

export default router;
