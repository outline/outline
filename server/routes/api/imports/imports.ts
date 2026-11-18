import Router from "@koa/router";
import { randomUUID } from "node:crypto";
import { truncate } from "es-toolkit/compat";
import type { WhereOptions } from "sequelize";
import type { IntegrationType } from "@shared/types";
import { ImportState, UserRole } from "@shared/types";
import { ImportValidation } from "@shared/validations";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Attachment, Collection, Document, Integration } from "@server/models";
import Import from "@server/models/Import";
import { authorize } from "@server/policies";
import { presentImport, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

/**
 * Resolves and authorizes the optional import destination. When a collection
 * is chosen the user must be able to create documents in it; when a document
 * is chosen the user must be able to add children to it.
 *
 * @param ctx The API context for the create request.
 * @returns The resolved destination ids (both null when no destination set).
 */
async function resolveImportDestination(
  ctx: APIContext<T.ImportsCreateReq>
): Promise<{ collectionId: string | null; documentId: string | null }> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
  const { collectionId, documentId } = ctx.input.body;

  if (collectionId) {
    const collection = await Collection.findByPk(collectionId, {
      userId: user.id,
      transaction,
      rejectOnEmpty: true,
    });
    authorize(user, "createDocument", collection);
    return { collectionId, documentId: null };
  }

  if (documentId) {
    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction,
      rejectOnEmpty: true,
    });
    authorize(user, "createChildDocument", document);

    return { collectionId: null, documentId };
  }

  return { collectionId: null, documentId: null };
}

router.post(
  "imports.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth({ role: UserRole.Admin }),
  validate(T.ImportsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.ImportsCreateReq>) => {
    const body = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createImport", user.team);

    const { collectionId, documentId } = await resolveImportDestination(ctx);

    if ("attachmentId" in body) {
      const attachment = await Attachment.findByPk(body.attachmentId, {
        rejectOnEmpty: true,
      });
      authorize(user, "read", attachment);

      const importModel = await Import.createWithCtx(ctx, {
        name: truncate(attachment.name, {
          length: ImportValidation.maxNameLength,
        }),
        service: body.service,
        state: ImportState.Created,
        input: [
          {
            externalId: randomUUID(),
            permission: body.permission,
          },
        ],
        scratch: { storageKey: attachment.key },
        integrationId: null,
        collectionId,
        documentId,
        createdById: user.id,
        teamId: user.teamId,
      });
      importModel.createdBy = user;

      ctx.body = {
        data: presentImport(importModel),
        policies: presentPolicies(user, [importModel]),
      };
      return;
    }

    const integration = await Integration.findByPk<
      Integration<IntegrationType.Import>
    >(body.integrationId, {
      rejectOnEmpty: true,
    });
    authorize(user, "read", integration);

    const name = integration.settings.externalWorkspace.name;

    const importModel = await Import.createWithCtx(ctx, {
      name: truncate(name, { length: ImportValidation.maxNameLength }),
      service: body.service,
      state: ImportState.Created,
      input: body.input,
      integrationId: body.integrationId,
      collectionId,
      documentId,
      createdById: user.id,
      teamId: user.teamId,
    });
    importModel.createdBy = user;

    ctx.body = {
      data: presentImport(importModel),
      policies: presentPolicies(user, [importModel]),
    };
  }
);

router.post(
  "imports.list",
  auth({ role: UserRole.Admin }),
  pagination(),
  validate(T.ImportsListSchema),
  async (ctx: APIContext<T.ImportsListReq>) => {
    const { service, sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "listImports", user.team);

    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const where: WhereOptions<Import<any>> = { teamId: user.teamId };

    if (service) {
      where.service = service;
    }

    const [imports, total] = await Promise.all([
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      Import.findAll<Import<any>>({
        where,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      Import.count<Import<any>>({
        where,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: imports.map(presentImport),
      policies: presentPolicies(user, imports),
    };
  }
);

router.post(
  "imports.info",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsInfoSchema),
  async (ctx: APIContext<T.ImportsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const importModel = await Import.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "read", importModel);

    ctx.body = {
      data: presentImport(importModel),
      policies: presentPolicies(user, [importModel]),
    };
  }
);

router.post(
  "imports.delete",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.ImportsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const importModel = await Import.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: { level: transaction.LOCK.NO_KEY_UPDATE, of: Import },
    });
    authorize(user, "delete", importModel);

    await importModel.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "imports.cancel",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsCancelSchema),
  transaction(),
  async (ctx: APIContext<T.ImportsCancelReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    let importModel = await Import.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: { level: transaction.LOCK.NO_KEY_UPDATE, of: Import },
    });
    authorize(user, "cancel", importModel);

    importModel.state = ImportState.Canceled;
    importModel = await importModel.saveWithCtx(ctx);

    ctx.body = {
      data: presentImport(importModel),
      policies: presentPolicies(user, [importModel]),
    };
  }
);

export default router;
