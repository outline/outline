import Router from "koa-router";
import { WhereOptions } from "sequelize";
import { UserRole } from "@shared/types";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { FileOperation, Team } from "@server/models";
import { authorize } from "@server/policies";
import { presentFileOperation } from "@server/presenters";
import FileStorage from "@server/storage/files";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "fileOperations.info",
  auth({ role: UserRole.Admin }),
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
  auth({ role: UserRole.Admin }),
  pagination(),
  validate(T.FileOperationsListSchema),
  async (ctx: APIContext<T.FileOperationsListReq>) => {
    const { direction, sort, type } = ctx.input.body;
    const { user } = ctx.state.auth;

    const where: WhereOptions<FileOperation> = {
      teamId: user.teamId,
      type,
    };
    const team = await Team.findByPk(user.teamId);
    authorize(user, "update", team);

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

const handleFileOperationsRedirect = async (
  ctx: APIContext<T.FileOperationsRedirectReq>
) => {
  const id = (ctx.input.body.id ?? ctx.input.query.id) as string;
  const { user } = ctx.state.auth;

  const fileOperation = await FileOperation.unscoped().findByPk(id, {
    rejectOnEmpty: true,
  });
  authorize(user, "read", fileOperation);

  if (fileOperation.state !== "complete") {
    throw ValidationError(`${fileOperation.type} is not complete yet`);
  }

  const accessUrl = await FileStorage.getSignedUrl(fileOperation.key);
  ctx.redirect(accessUrl);
};

router.get(
  "fileOperations.redirect",
  auth({ role: UserRole.Admin }),
  validate(T.FileOperationsRedirectSchema),
  handleFileOperationsRedirect
);
router.post(
  "fileOperations.redirect",
  auth({ role: UserRole.Admin }),
  validate(T.FileOperationsRedirectSchema),
  handleFileOperationsRedirect
);

router.post(
  "fileOperations.delete",
  auth({ role: UserRole.Admin }),
  validate(T.FileOperationsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.FileOperationsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const fileOperation = await FileOperation.unscoped().findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", fileOperation);

    await fileOperation.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
