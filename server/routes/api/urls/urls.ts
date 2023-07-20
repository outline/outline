import Router from "koa-router";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import parseMentionUrl from "@shared/utils/parseMentionUrl";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentDocument, presentMention } from "@server/presenters/unfurls";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "urls.unfurl",
  auth(),
  validate(T.UrlsUnfurlSchema),
  transaction(),
  async (ctx: APIContext<T.UrlsUnfurlReq>) => {
    const { url, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const urlObj = new URL(url);
    if (urlObj.protocol === "mention:") {
      const { modelId: userId } = parseMentionUrl(url);

      const [mentionedUser, document] = await Promise.all([
        User.findByPk(userId, { transaction }),
        Document.findByPk(documentId!, {
          userId,
          transaction,
        }),
      ]);
      if (!mentionedUser) {
        throw NotFoundError("Mentioned user does not exist");
      }
      if (!document) {
        throw NotFoundError("Document does not exist");
      }
      authorize(user, "read", mentionedUser);
      authorize(user, "read", document);

      ctx.body = presentMention(mentionedUser, document);

      return;
    }

    const docId = parseDocumentSlug(url);
    const document = await Document.findByPk(docId!, { transaction });
    if (!document) {
      throw NotFoundError("Document does not exist");
    }
    authorize(user, "read", document);

    ctx.body = presentDocument(document, user);
  }
);

export default router;
