import Router from "koa-router";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import parseMentionUrl from "@shared/utils/parseMentionUrl";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentDocument, presentMention } from "@server/presenters/unfurls";
import { APIContext } from "@server/types";
import { Iframely } from "@server/utils/unfurl";
import * as T from "./schema";

const router = new Router();

router.post(
  "urls.unfurl",
  auth(),
  validate(T.UrlsUnfurlSchema),
  async (ctx: APIContext<T.UrlsUnfurlReq>) => {
    const { url, documentId } = ctx.input.body;
    const { user: actor } = ctx.state.auth;
    const urlObj = new URL(url);

    if (urlObj.protocol === "mention:") {
      const { modelId: userId } = parseMentionUrl(url);

      const [user, document] = await Promise.all([
        User.findByPk(userId),
        Document.findByPk(documentId!, {
          userId,
        }),
      ]);
      if (!user) {
        throw NotFoundError("Mentioned user does not exist");
      }
      if (!document) {
        throw NotFoundError("Document does not exist");
      }
      authorize(actor, "read", user);
      authorize(actor, "read", document);

      ctx.body = presentMention(user, document);
      return;
    }

    const previewDocumentId = parseDocumentSlug(url);
    if (previewDocumentId) {
      const document = previewDocumentId
        ? await Document.findByPk(previewDocumentId)
        : undefined;
      if (!document) {
        throw NotFoundError("Document does not exist");
      }
      authorize(actor, "read", document);

      ctx.body = presentDocument(document, actor);
      return;
    }

    const data = await Iframely.unfurl(url);
    ctx.body = data;
  }
);

export default router;
