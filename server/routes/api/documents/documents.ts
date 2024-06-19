import path from "path";
import fractionalIndex from "fractional-index";
import fs from "fs-extra";
import invariant from "invariant";
import JSZip from "jszip";
import Router from "koa-router";
import escapeRegExp from "lodash/escapeRegExp";
import uniq from "lodash/uniq";
import mime from "mime-types";
import { Op, ScopeOptions, Sequelize, WhereOptions } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { StatusFilter, TeamPreference, UserRole } from "@shared/types";
import { subtractDate } from "@shared/utils/date";
import slugify from "@shared/utils/slugify";
import documentCreator from "@server/commands/documentCreator";
import documentDuplicator from "@server/commands/documentDuplicator";
import documentLoader from "@server/commands/documentLoader";
import documentMover from "@server/commands/documentMover";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import documentUpdater from "@server/commands/documentUpdater";
import env from "@server/env";
import {
  NotFoundError,
  InvalidRequestError,
  AuthenticationError,
  ValidationError,
  IncorrectEditionError,
} from "@server/errors";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import multipart from "@server/middlewares/multipart";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import {
  Attachment,
  Backlink,
  Collection,
  Document,
  Event,
  Revision,
  SearchQuery,
  User,
  View,
  UserMembership,
} from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import SearchHelper from "@server/models/helpers/SearchHelper";
import { authorize, cannot } from "@server/policies";
import {
  presentCollection,
  presentDocument,
  presentPolicies,
  presentMembership,
  presentPublicTeam,
  presentUser,
} from "@server/presenters";
import DocumentImportTask, {
  DocumentImportTaskResponse,
} from "@server/queues/tasks/DocumentImportTask";
import FileStorage from "@server/storage/files";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import ZipHelper from "@server/utils/ZipHelper";
import { getTeamFromContext } from "@server/utils/passport";
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
      const membership = await UserMembership.findOne({
        where: {
          userId: user.id,
          documentId: parentDocumentId,
        },
      });

      if (membership) {
        delete where.collectionId;
      }

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

    const [documents, total] = await Promise.all([
      Document.defaultScopeWithUser(user.id).findAll({
        where,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Document.count({ where }),
    ]);

    // index sort is special because it uses the order of the documents in the
    // collection.documentStructure rather than a database column
    if (documentIds.length) {
      documents.sort(
        (a, b) => documentIds.indexOf(a.id) - documentIds.indexOf(b.id)
      );
    }

    const data = await Promise.all(
      documents.map((document) => presentDocument(ctx, document))
    );
    const policies = presentPolicies(user, documents);
    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data,
      policies,
    };
  }
);

router.post(
  "documents.archived",
  auth({ role: UserRole.Member }),
  pagination(),
  validate(T.DocumentsArchivedSchema),
  async (ctx: APIContext<T.DocumentsArchivedReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;
    const collectionIds = await user.collectionIds();
    const documents = await Document.defaultScopeWithUser(user.id).findAll({
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
      documents.map((document) => presentDocument(ctx, document))
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
  auth({ role: UserRole.Member }),
  pagination(),
  validate(T.DocumentsDeletedSchema),
  async (ctx: APIContext<T.DocumentsDeletedReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;
    const collectionIds = await user.collectionIds({
      paranoid: false,
    });
    const membershipScope: Readonly<ScopeOptions> = {
      method: ["withMembership", user.id],
    };
    const collectionScope: Readonly<ScopeOptions> = {
      method: ["withCollectionPermissions", user.id],
    };
    const viewScope: Readonly<ScopeOptions> = {
      method: ["withViews", user.id],
    };
    const documents = await Document.scope([
      membershipScope,
      collectionScope,
      viewScope,
      "withDrafts",
    ]).findAll({
      where: {
        teamId: user.teamId,
        deletedAt: {
          [Op.ne]: null,
        },
        [Op.or]: [
          {
            collectionId: {
              [Op.in]: collectionIds,
            },
          },
          {
            createdById: user.id,
            collectionId: {
              [Op.is]: null,
            },
          },
        ],
      },
      paranoid: false,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });
    const data = await Promise.all(
      documents.map((document) => presentDocument(ctx, document))
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
          model: Document.scope([
            "withDrafts",
            { method: ["withMembership", userId] },
          ]),
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
      documents.map((document) => presentDocument(ctx, document))
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

    const documents = await Document.defaultScopeWithUser(user.id).findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });
    const data = await Promise.all(
      documents.map((document) => presentDocument(ctx, document))
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
  auth({ optional: true }),
  validate(T.DocumentsInfoSchema),
  async (ctx: APIContext<T.DocumentsInfoReq>) => {
    const { id, shareId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const apiVersion = getAPIVersion(ctx);
    const teamFromCtx = await getTeamFromContext(ctx);
    const { document, share, collection } = await documentLoader({
      id,
      shareId,
      user,
      teamId: teamFromCtx?.id,
    });
    const isPublic = cannot(user, "read", document);
    const serializedDocument = await presentDocument(ctx, document, {
      isPublic,
    });

    const team = await document.$get("team");

    // Passing apiVersion=2 has a single effect, to change the response payload to
    // include top level keys for document, sharedTree, and team.
    const data =
      apiVersion >= 2
        ? {
            document: serializedDocument,
            team: team
              ? presentPublicTeam(
                  team,
                  !!team?.getPreference(TeamPreference.PublicBranding)
                )
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

    const [collection, memberIds, collectionMemberIds] = await Promise.all([
      document.$get("collection"),
      Document.membershipUserIds(document.id),
      document.collectionId
        ? Collection.membershipUserIds(document.collectionId)
        : [],
    ]);

    where = {
      ...where,
      [Op.or]: [
        {
          id: {
            [Op.in]: uniq([...memberIds, ...collectionMemberIds]),
          },
        },
        collection?.permission
          ? {
              role: {
                [Op.ne]: UserRole.Guest,
              },
            }
          : {},
      ],
    };

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

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: users.map((user) => presentUser(user)),
      policies: presentPolicies(actor, users),
    };
  }
);

router.post(
  "documents.export",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth({ optional: true }),
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

    let contentType: string;
    let content: string;

    if (accept?.includes("text/html")) {
      contentType = "text/html";
      content = await DocumentHelper.toHTML(document, {
        centered: true,
        includeMermaid: true,
      });
    } else if (accept?.includes("application/pdf")) {
      throw IncorrectEditionError(
        "PDF export is not available in the community edition"
      );
    } else if (accept?.includes("text/markdown")) {
      contentType = "text/markdown";
      content = DocumentHelper.toMarkdown(document);
    } else {
      ctx.body = {
        data: DocumentHelper.toMarkdown(document),
      };
      return;
    }

    // Override the extension for Markdown as it's incorrect in the mime-types
    // library until a new release > 2.1.35
    const extension =
      contentType === "text/markdown" ? "md" : mime.extension(contentType);

    const fileName = slugify(document.titleWithDefault);
    const attachmentIds = ProsemirrorHelper.parseAttachmentIds(
      DocumentHelper.toProsemirror(document)
    );
    const attachments = attachmentIds.length
      ? await Attachment.findAll({
          where: {
            teamId: document.teamId,
            id: attachmentIds,
          },
        })
      : [];

    if (attachments.length === 0) {
      ctx.set("Content-Type", contentType);
      ctx.attachment(`${fileName}.${extension}`);
      ctx.body = content;
      return;
    }

    const zip = new JSZip();

    await Promise.all(
      attachments.map(async (attachment) => {
        const location = path.join(
          "attachments",
          `${attachment.id}.${mime.extension(attachment.contentType)}`
        );
        zip.file(
          location,
          new Promise<Buffer>((resolve) => {
            attachment.buffer.then(resolve).catch((err) => {
              Logger.warn(`Failed to read attachment from storage`, {
                attachmentId: attachment.id,
                teamId: attachment.teamId,
                error: err.message,
              });
              resolve(Buffer.from(""));
            });
          }),
          {
            date: attachment.updatedAt,
            createFolders: true,
          }
        );

        content = content.replace(
          new RegExp(escapeRegExp(attachment.redirectUrl), "g"),
          location
        );
      })
    );

    zip.file(`${fileName}.${extension}`, content, {
      date: document.updatedAt,
    });

    ctx.set("Content-Type", "application/zip");
    ctx.attachment(`${fileName}.zip`);
    ctx.body = zip.generateNodeStream(ZipHelper.defaultStreamOptions);
  }
);

router.post(
  "documents.restore",
  auth({ role: UserRole.Member }),
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
      await Event.createFromContext(ctx, {
        name: "documents.restore",
        documentId: document.id,
        collectionId: document.collectionId,
        data: {
          title: document.title,
        },
      });
    } else if (document.archivedAt) {
      authorize(user, "unarchive", document);
      // restore a previously archived document
      await document.unarchive(user.id);
      await Event.createFromContext(ctx, {
        name: "documents.unarchive",
        documentId: document.id,
        collectionId: document.collectionId,
        data: {
          title: document.title,
        },
      });
    } else if (revisionId) {
      // restore a document to a specific revision
      authorize(user, "update", document);
      const revision = await Revision.findByPk(revisionId);
      authorize(document, "restore", revision);

      document.restoreFromRevision(revision);
      await document.save();

      await Event.createFromContext(ctx, {
        name: "documents.restore",
        documentId: document.id,
        collectionId: document.collectionId,
        data: {
          title: document.title,
        },
      });
    } else {
      assertPresent(revisionId, "revisionId is required");
    }

    ctx.body = {
      data: await presentDocument(ctx, document),
      policies: presentPolicies(user, [document]),
    };
  }
);

router.post(
  "documents.search_titles",
  auth(),
  pagination(),
  rateLimiter(RateLimiterStrategy.OneHundredPerMinute),
  validate(T.DocumentsSearchSchema),
  async (ctx: APIContext<T.DocumentsSearchReq>) => {
    const { query, statusFilter, dateFilter, collectionId, userId } =
      ctx.input.body;
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
      dateFilter,
      statusFilter,
      collectionId,
      collaboratorIds,
      offset,
      limit,
    });
    const policies = presentPolicies(user, documents);
    const data = await Promise.all(
      documents.map((document) => presentDocument(ctx, document))
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
  auth({ optional: true }),
  pagination(),
  rateLimiter(RateLimiterStrategy.OneHundredPerMinute),
  validate(T.DocumentsSearchSchema),
  async (ctx: APIContext<T.DocumentsSearchReq>) => {
    const {
      query,
      collectionId,
      documentId,
      userId,
      dateFilter,
      statusFilter = [],
      includeArchived,
      includeDrafts,
      shareId,
      snippetMinWords,
      snippetMaxWords,
    } = ctx.input.body;
    const { offset, limit } = ctx.state.pagination;

    // Unfortunately, this still doesn't adequately handle cases when auth is optional
    const { user } = ctx.state.auth;

    // TODO: Deprecated filter options, remove in a few versions
    if (includeArchived && !statusFilter.includes(StatusFilter.Archived)) {
      statusFilter.push(StatusFilter.Archived);
    }
    if (includeDrafts && !statusFilter.includes(StatusFilter.Draft)) {
      statusFilter.push(StatusFilter.Draft);
    }

    let teamId;
    let response;
    let share;

    if (shareId) {
      const teamFromCtx = await getTeamFromContext(ctx);
      const { document, ...loaded } = await documentLoader({
        teamId: teamFromCtx?.id,
        shareId,
        user,
      });

      share = loaded.share;

      if (!share?.includeChildDocuments) {
        throw InvalidRequestError("Child documents cannot be searched");
      }

      teamId = share.teamId;
      const team = await share.$get("team");
      invariant(team, "Share must belong to a team");

      response = await SearchHelper.searchForTeam(team, query, {
        collectionId: document.collectionId,
        share,
        dateFilter,
        statusFilter,
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

      let documentIds = undefined;
      if (documentId) {
        const document = await Document.findByPk(documentId, {
          userId: user.id,
        });
        authorize(user, "read", document);
        documentIds = [
          documentId,
          ...(await document.findAllChildDocumentIds()),
        ];
      }

      let collaboratorIds = undefined;

      if (userId) {
        collaboratorIds = [userId];
      }

      response = await SearchHelper.searchForUser(user, query, {
        collaboratorIds,
        collectionId,
        documentIds,
        dateFilter,
        statusFilter,
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
        const document = await presentDocument(ctx, result.document);
        return { ...result, document };
      })
    );

    // When requesting subsequent pages of search results we don't want to record
    // duplicate search query records
    if (offset === 0) {
      await SearchQuery.create({
        userId: user?.id,
        teamId,
        shareId: share?.id,
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
  auth({ role: UserRole.Member }),
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  validate(T.DocumentsTemplatizeSchema),
  transaction(),
  async (ctx: APIContext<T.DocumentsTemplatizeReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const original = await Document.findByPk(id, {
      userId: user.id,
      transaction,
    });

    authorize(user, "update", original);

    const document = await Document.create(
      {
        editorVersion: original.editorVersion,
        collectionId: original.collectionId,
        teamId: original.teamId,
        publishedAt: new Date(),
        lastModifiedById: user.id,
        createdById: user.id,
        template: true,
        emoji: original.emoji,
        title: original.title,
        text: original.text,
        content: original.content,
      },
      {
        transaction,
      }
    );
    await Event.createFromContext(
      ctx,
      {
        name: "documents.create",
        documentId: document.id,
        collectionId: document.collectionId,
        data: {
          title: document.title,
          template: true,
        },
      },
      {
        transaction,
      }
    );

    // reload to get all of the data needed to present (user, collection etc)
    const reloaded = await Document.findByPk(document.id, {
      userId: user.id,
      transaction,
    });
    invariant(reloaded, "document not found");

    ctx.body = {
      data: await presentDocument(ctx, reloaded),
      policies: presentPolicies(user, [reloaded]),
    };
  }
);

router.post(
  "documents.update",
  auth(),
  validate(T.DocumentsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.DocumentsUpdateReq>) => {
    const { transaction } = ctx.state;
    const { id, insightsEnabled, publish, collectionId, ...input } =
      ctx.input.body;
    const editorVersion = ctx.headers["x-editor-version"] as string | undefined;

    const { user } = ctx.state.auth;
    let collection: Collection | null | undefined;

    const document = await Document.findByPk(id, {
      userId: user.id,
      includeState: true,
      transaction,
    });
    collection = document?.collection;
    authorize(user, "update", document);

    if (collection && insightsEnabled !== undefined) {
      authorize(user, "updateInsights", document);
    }

    if (publish) {
      if (document.isDraft) {
        authorize(user, "publish", document);
      }

      if (!document.collectionId) {
        assertPresent(
          collectionId,
          "collectionId is required to publish a draft without collection"
        );
        collection = await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(collectionId!, { transaction });
      }
      authorize(user, "createDocument", collection);
    }

    await documentUpdater({
      document,
      user,
      ...input,
      publish,
      collectionId,
      insightsEnabled,
      editorVersion,
      transaction,
      ip: ctx.request.ip,
    });

    collection = document.collectionId
      ? await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(document.collectionId, { transaction })
      : null;

    document.updatedBy = user;
    document.collection = collection;

    ctx.body = {
      data: await presentDocument(ctx, document),
      policies: presentPolicies(user, [document, collection]),
    };
  }
);

router.post(
  "documents.duplicate",
  auth(),
  validate(T.DocumentsDuplicateSchema),
  transaction(),
  async (ctx: APIContext<T.DocumentsDuplicateReq>) => {
    const { transaction } = ctx.state;
    const { id, title, publish, recursive, collectionId, parentDocumentId } =
      ctx.input.body;
    const { user } = ctx.state.auth;

    const document = await Document.findByPk(id, {
      userId: user.id,
      transaction,
    });
    authorize(user, "read", document);

    const collection = collectionId
      ? await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(collectionId, { transaction })
      : document?.collection;

    if (collection) {
      authorize(user, "updateDocument", collection);
    }

    if (parentDocumentId) {
      const parent = await Document.findByPk(parentDocumentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "update", parent);

      if (!parent.publishedAt) {
        throw InvalidRequestError("Cannot duplicate document inside a draft");
      }
    }

    const response = await documentDuplicator({
      user,
      collection,
      document,
      title,
      publish,
      transaction,
      recursive,
      parentDocumentId,
      ip: ctx.request.ip,
    });

    ctx.body = {
      data: {
        documents: await Promise.all(
          response.map((document) => presentDocument(ctx, document))
        ),
      },
      policies: presentPolicies(user, response),
    };
  }
);

router.post(
  "documents.move",
  auth(),
  validate(T.DocumentsMoveSchema),
  transaction(),
  async (ctx: APIContext<T.DocumentsMoveReq>) => {
    const { transaction } = ctx.state;
    const { id, collectionId, parentDocumentId, index } = ctx.input.body;
    const { user } = ctx.state.auth;
    const document = await Document.findByPk(id, {
      userId: user.id,
      transaction,
    });
    authorize(user, "move", document);

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId, { transaction });
    authorize(user, "updateDocument", collection);

    if (parentDocumentId) {
      const parent = await Document.findByPk(parentDocumentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "update", parent);

      if (!parent.publishedAt) {
        throw InvalidRequestError("Cannot move document inside a draft");
      }
    }

    const { documents, collections, collectionChanged } = await documentMover({
      user,
      document,
      collectionId,
      parentDocumentId,
      index,
      ip: ctx.request.ip,
      transaction,
    });

    ctx.body = {
      data: {
        documents: await Promise.all(
          documents.map((document) => presentDocument(ctx, document))
        ),
        collections: await Promise.all(
          collections.map((collection) => presentCollection(ctx, collection))
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
    await Event.createFromContext(ctx, {
      name: "documents.archive",
      documentId: document.id,
      collectionId: document.collectionId,
      data: {
        title: document.title,
      },
    });

    ctx.body = {
      data: await presentDocument(ctx, document),
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

      await documentPermanentDeleter([document]);
      await Event.createFromContext(ctx, {
        name: "documents.permanent_delete",
        documentId: document.id,
        collectionId: document.collectionId,
        data: {
          title: document.title,
        },
      });
    } else {
      const document = await Document.findByPk(id, {
        userId: user.id,
      });

      authorize(user, "delete", document);

      await document.delete(user.id);
      await Event.createFromContext(ctx, {
        name: "documents.delete",
        documentId: document.id,
        collectionId: document.collectionId,
        data: {
          title: document.title,
        },
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
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const document = await Document.findByPk(id, {
      userId: user.id,
    });
    authorize(user, "unpublish", document);

    const childDocumentIds = await document.findAllChildDocumentIds({
      archivedAt: {
        [Op.eq]: null,
      },
    });
    if (childDocumentIds.length > 0) {
      throw InvalidRequestError(
        "Cannot unpublish document with child documents"
      );
    }

    await document.unpublish(user.id);
    await Event.createFromContext(ctx, {
      name: "documents.unpublish",
      documentId: document.id,
      collectionId: document.collectionId,
      data: {
        title: document.title,
      },
    });

    ctx.body = {
      data: await presentDocument(ctx, document),
      policies: presentPolicies(user, [document]),
    };
  }
);

router.post(
  "documents.import",
  auth(),
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  validate(T.DocumentsImportSchema),
  multipart({ maximumFileSize: env.FILE_STORAGE_IMPORT_MAX_SIZE }),
  async (ctx: APIContext<T.DocumentsImportReq>) => {
    const { collectionId, parentDocumentId, publish } = ctx.input.body;
    const file = ctx.input.file;
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
      parentDocument = await Document.findByPk(parentDocumentId, {
        userId: user.id,
      });
      authorize(user, "read", parentDocument);
    }

    const buffer = await fs.readFile(file.filepath);
    const fileName = file.originalFilename ?? file.newFilename;
    const mimeType = file.mimetype ?? "";
    const acl = "private";

    const key = AttachmentHelper.getKey({
      acl,
      id: uuidv4(),
      name: fileName,
      userId: user.id,
    });

    await FileStorage.store({
      body: buffer,
      contentType: mimeType,
      contentLength: buffer.length,
      key,
      acl,
    });

    const job = await DocumentImportTask.schedule({
      key,
      sourceMetadata: {
        fileName,
        mimeType,
      },
      userId: user.id,
      collectionId,
      parentDocumentId,
      publish,
      ip: ctx.request.ip,
    });
    const response: DocumentImportTaskResponse = await job.finished();
    if ("error" in response) {
      throw InvalidRequestError(response.error);
    }

    const document = await Document.findByPk(response.documentId, {
      userId: user.id,
      rejectOnEmpty: true,
    });

    ctx.body = {
      data: await presentDocument(ctx, document),
      policies: presentPolicies(user, [document]),
    };
  }
);

router.post(
  "documents.create",
  auth(),
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  validate(T.DocumentsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.DocumentsCreateReq>) => {
    const {
      title,
      text,
      emoji,
      publish,
      collectionId,
      parentDocumentId,
      fullWidth,
      templateId,
      template,
      createdAt,
    } = ctx.input.body;
    const editorVersion = ctx.headers["x-editor-version"] as string | undefined;

    const { transaction } = ctx.state;
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
        transaction,
      });
      authorize(user, "createDocument", collection);
    }

    let parentDocument;

    if (parentDocumentId) {
      parentDocument = await Document.findByPk(parentDocumentId, {
        userId: user.id,
      });
      authorize(user, "read", parentDocument, {
        collection,
      });
    }

    let templateDocument: Document | null | undefined;

    if (templateId) {
      templateDocument = await Document.findByPk(templateId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "read", templateDocument);
    }

    const document = await documentCreator({
      title,
      text,
      emoji,
      createdAt,
      publish,
      collectionId,
      parentDocumentId,
      templateDocument,
      template,
      fullWidth,
      user,
      editorVersion,
      ip: ctx.request.ip,
      transaction,
    });

    document.collection = collection;

    ctx.body = {
      data: await presentDocument(ctx, document),
      policies: presentPolicies(user, [document]),
    };
  }
);

router.post(
  "documents.add_user",
  auth(),
  validate(T.DocumentsAddUserSchema),
  rateLimiter(RateLimiterStrategy.OneHundredPerHour),
  transaction(),
  async (ctx: APIContext<T.DocumentsAddUserReq>) => {
    const { auth, transaction } = ctx.state;
    const actor = auth.user;
    const { id, userId, permission } = ctx.input.body;

    if (userId === actor.id) {
      throw ValidationError("You cannot invite yourself");
    }

    const [document, user] = await Promise.all([
      Document.findByPk(id, {
        userId: actor.id,
        rejectOnEmpty: true,
        transaction,
      }),
      User.findByPk(userId, {
        rejectOnEmpty: true,
        transaction,
      }),
    ]);

    authorize(actor, "read", user);
    authorize(actor, "manageUsers", document);

    const UserMemberships = await UserMembership.findAll({
      where: {
        userId,
      },
      attributes: ["id", "index", "updatedAt"],
      limit: 1,
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        // find only the first star so we can create an index before it
        Sequelize.literal('"user_permission"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      transaction,
    });

    // create membership at the beginning of their "Shared with me" section
    const index = fractionalIndex(
      null,
      UserMemberships.length ? UserMemberships[0].index : null
    );

    const [membership, isNew] = await UserMembership.findOrCreate({
      where: {
        documentId: id,
        userId,
      },
      defaults: {
        index,
        permission: permission || user.defaultDocumentPermission,
        createdById: actor.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (permission) {
      membership.permission = permission;

      // disconnect from the source if the permission is manually updated
      membership.sourceId = null;

      await membership.save({ transaction });
    }

    await Event.createFromContext(
      ctx,
      {
        name: "documents.add_user",
        userId,
        modelId: membership.id,
        documentId: document.id,
        data: {
          title: document.title,
          isNew,
          permission: membership.permission,
        },
      },
      {
        transaction,
      }
    );

    ctx.body = {
      data: {
        users: [presentUser(user)],
        memberships: [presentMembership(membership)],
      },
    };
  }
);

router.post(
  "documents.remove_user",
  auth(),
  validate(T.DocumentsRemoveUserSchema),
  transaction(),
  async (ctx: APIContext<T.DocumentsRemoveUserReq>) => {
    const { auth, transaction } = ctx.state;
    const actor = auth.user;
    const { id, userId } = ctx.input.body;

    const [document, user] = await Promise.all([
      Document.findByPk(id, {
        userId: actor.id,
        rejectOnEmpty: true,
        transaction,
      }),
      User.findByPk(userId, {
        rejectOnEmpty: true,
        transaction,
      }),
    ]);

    if (actor.id !== userId) {
      authorize(actor, "manageUsers", document);
      authorize(actor, "read", user);
    }

    const membership = await UserMembership.findOne({
      where: {
        documentId: id,
        userId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });

    await membership.destroy({ transaction });

    await Event.createFromContext(
      ctx,
      {
        name: "documents.remove_user",
        userId,
        modelId: membership.id,
        documentId: document.id,
      },
      { transaction }
    );

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "documents.memberships",
  auth(),
  pagination(),
  validate(T.DocumentsMembershipsSchema),
  async (ctx: APIContext<T.DocumentsMembershipsReq>) => {
    const { id, query, permission } = ctx.input.body;
    const { user: actor } = ctx.state.auth;

    const document = await Document.findByPk(id, { userId: actor.id });
    authorize(actor, "update", document);

    let where: WhereOptions<UserMembership> = {
      documentId: id,
    };
    let userWhere;

    if (query) {
      userWhere = {
        name: {
          [Op.iLike]: `%${query}%`,
        },
      };
    }

    if (permission) {
      where = { ...where, permission };
    }

    const options = {
      where,
      include: [
        {
          model: User,
          as: "user",
          where: userWhere,
          required: true,
        },
      ],
    };

    const [total, memberships] = await Promise.all([
      UserMembership.count(options),
      UserMembership.findAll({
        ...options,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        memberships: memberships.map(presentMembership),
        users: memberships.map((membership) => presentUser(membership.user)),
      },
    };
  }
);

router.post(
  "documents.empty_trash",
  auth({ role: UserRole.Admin }),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;

    const collectionIds = await user.collectionIds({
      paranoid: false,
    });
    const collectionScope: Readonly<ScopeOptions> = {
      method: ["withCollectionPermissions", user.id],
    };
    const documents = await Document.scope([
      collectionScope,
      "withDrafts",
    ]).findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
        },
        [Op.or]: [
          {
            collectionId: {
              [Op.in]: collectionIds,
            },
          },
          {
            createdById: user.id,
            collectionId: {
              [Op.is]: null,
            },
          },
        ],
      },
      paranoid: false,
    });

    await documentPermanentDeleter(documents);
    await Event.createFromContext(ctx, {
      name: "documents.empty_trash",
    });

    ctx.body = {
      success: true,
    };
  }
);

// Remove this helper once apiVersion is removed (#6175)
function getAPIVersion(ctx: APIContext) {
  return Number(
    ctx.headers["x-api-version"] ??
      (typeof ctx.input.body === "object" &&
        ctx.input.body &&
        "apiVersion" in ctx.input.body &&
        ctx.input.body.apiVersion) ??
      0
  );
}

export default router;
