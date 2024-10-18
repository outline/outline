import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Comment, Document, Reaction } from "@server/models";
import { authorize } from "@server/policies";
import { presentReaction } from "@server/presenters";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "reactions.list",
  auth(),
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

    const reactions: Reaction[] = [];

    await Reaction.findAllInBatches<Reaction>(
      {
        where: {
          commentId,
        },
        include: "user",
        batchLimit: 100,
      },
      async (result) => void reactions.push(...result)
    );

    ctx.body = {
      data: reactions.map(presentReaction),
    };
  }
);

export default router;
