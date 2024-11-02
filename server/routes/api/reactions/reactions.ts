import Router from "koa-router";
import { WhereOptions } from "sequelize";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Comment, Document, Reaction, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentReaction } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "reactions.list",
  auth(),
  pagination(),
  validate(T.ReactionsListSchema),
  async (ctx: APIContext<T.ReactionsListReq>) => {
    const { commentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const comment = await Comment.findByPk(commentId, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });

    authorize(user, "readReaction", comment);
    authorize(user, "read", document);

    const where: WhereOptions<Reaction> = {
      commentId,
    };

    const include = [
      {
        model: User,
        required: true,
      },
    ];

    const [reactions, total] = await Promise.all([
      Reaction.findAll({
        where,
        include,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Reaction.count({
        where,
        include,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: reactions.map(presentReaction),
    };
  }
);

export default router;
