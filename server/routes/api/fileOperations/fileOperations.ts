import Router from "koa-router";
import { WhereOptions } from "sequelize";
import { FileOperationType } from "@shared/types";
import fileOperationDeleter from "@server/commands/fileOperationDeleter";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { FileOperation, Team } from "@server/models";
import { authorize } from "@server/policies";
import { presentFileOperation } from "@server/presenters";
import { APIContext } from "@server/types";
import { getSignedUrl } from "@server/utils/s3";
import { assertIn, assertSort, assertUuid } from "@server/validation";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "fileOperations.info",
  auth({ admin: true }),
  validate(T.FileOperationsInfoSchema),
  async (ctx: APIContext<T.FileOperationsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const fileOperation = await FileOperation.findByPk(id, {
      rejectOnEmpty: true,
    });

    authorize(user, "read", fileOperation);

    ctx.body = {
      data: presentFileOperation(fileOperation),
    };
  }
);

router.post(
  "fileOperations.list",
  auth({ admin: true }),
  pagination(),
  async (ctx: APIContext) => {
    let { direction } = ctx.request.body;
    const { sort = "createdAt", type } = ctx.request.body;
    assertIn(type, Object.values(FileOperationType));
    assertSort(sort, FileOperation);

    if (direction !== "ASC") {
      direction = "DESC";
    }
    const { user } = ctx.state.auth;
    const where: WhereOptions<FileOperation> = {
      teamId: user.teamId,
      type,
    };
    const team = await Team.findByPk(user.teamId);
    authorize(user, "manage", team);

    const [exports, total] = await Promise.all([
      FileOperation.findAll({
        where,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      FileOperation.count({
        where,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: exports.map(presentFileOperation),
    };
  }
);

const handleFileOperationsRedirect = async (ctx: APIContext) => {
  const id = ctx.request.body?.id ?? ctx.request.query?.id;
  assertUuid(id, "id is required");

  const { user } = ctx.state.auth;
  const fileOperation = await FileOperation.unscoped().findByPk(id, {
    rejectOnEmpty: true,
  });
  authorize(user, "read", fileOperation);

  if (fileOperation.state !== "complete") {
    throw ValidationError(`${fileOperation.type} is not complete yet`);
  }

  const accessUrl = await getSignedUrl(fileOperation.key);
  ctx.redirect(accessUrl);
};

router.get(
  "fileOperations.redirect",
  auth({ admin: true }),
  handleFileOperationsRedirect
);
router.post(
  "fileOperations.redirect",
  auth({ admin: true }),
  handleFileOperationsRedirect
);

router.post(
  "fileOperations.delete",
  auth({ admin: true }),
  async (ctx: APIContext) => {
    const { id } = ctx.request.body;
    assertUuid(id, "id is required");

    const { user } = ctx.state.auth;
    const fileOperation = await FileOperation.unscoped().findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "delete", fileOperation);

    await fileOperationDeleter(fileOperation, user, ctx.request.ip);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
