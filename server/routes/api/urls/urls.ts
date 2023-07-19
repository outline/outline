import { differenceInMinutes, formatDistanceToNowStrict } from "date-fns";
import { t } from "i18next";
import Router from "koa-router";
import { head, orderBy } from "lodash";
import { dateLocale } from "@shared/utils/date";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import parseMentionUrl from "@shared/utils/parseMentionUrl";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, User } from "@server/models";
import { authorize } from "@server/policies";
import { APIContext } from "@server/types";
import { opts } from "@server/utils/i18n";
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
    const locale = dateLocale(user.language);
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

      const lastView = head(orderBy(document.views, ["updatedAt"], ["desc"]));
      const lastViewedAt = lastView ? lastView.updatedAt : undefined;
      const lastActiveAt = mentionedUser.lastActiveAt;
      let description;
      if (lastViewedAt && differenceInMinutes(new Date(), lastViewedAt) < 5) {
        description = t("Currently viewing", { ...opts(user) });
      } else if (
        lastActiveAt &&
        differenceInMinutes(new Date(), lastActiveAt) < 5
      ) {
        description = lastViewedAt
          ? t("Online now • Viewed {{ lastViewedAt }}", {
              lastViewedAt: formatDistanceToNowStrict(lastViewedAt, {
                addSuffix: true,
                locale,
              }),
              ...opts(user),
            })
          : t("Online now • Never viewed", { ...opts(user) });
      } else {
        description = lastViewedAt
          ? t("Online {{ lastActiveAt }} • Viewed {{ lastViewedAt }}", {
              lastActiveAt: formatDistanceToNowStrict(lastActiveAt!, {
                addSuffix: true,
                locale,
              }),
              lastViewedAt: formatDistanceToNowStrict(lastViewedAt, {
                addSuffix: true,
                locale,
              }),
              ...opts(user),
            })
          : t("Online {{ lastActiveAt }} • Never viewed", {
              lastActiveAt: formatDistanceToNowStrict(lastActiveAt!, {
                addSuffix: true,
                locale,
              }),
              ...opts(user),
            });
      }

      ctx.body = {
        url: mentionedUser.avatarUrl,
        type: "mention",
        title: mentionedUser.name,
        description,
        meta: {
          id: mentionedUser.id,
          color: mentionedUser.color,
        },
      };

      return;
    }

    const docId = parseDocumentSlug(url);
    const document = await Document.findByPk(docId!, { transaction });
    if (!document) {
      throw NotFoundError("Document does not exist");
    }
    authorize(user, "read", document);

    let description;

    if (document.createdAt === document.updatedAt) {
      description =
        document.createdById === user.id
          ? t("You created {{ createdAt }}", {
              createdAt: formatDistanceToNowStrict(document.createdAt, {
                addSuffix: true,
                locale,
              }),
              ...opts(user),
            })
          : t("{{ username }} created {{ createdAt }}", {
              userName: document.createdBy.name,
              createdAt: formatDistanceToNowStrict(document.createdAt, {
                addSuffix: true,
                locale,
              }),
              ...opts(user),
            });
    } else {
      description =
        document.updatedBy.id === user.id
          ? t("You updated {{ updatedAt }}", {
              updatedAt: formatDistanceToNowStrict(document.updatedAt, {
                addSuffix: true,
                locale,
              }),
              ...opts(user),
            })
          : t("{{ username }} updated {{ updatedAt }}", {
              username: document.updatedBy.name,
              updatedAt: formatDistanceToNowStrict(document.updatedAt, {
                addSuffix: true,
                locale,
              }),
              ...opts(user),
            });
    }

    ctx.body = {
      url: document.url,
      type: "document",
      title: document.titleWithDefault,
      description,
      meta: {
        id: document.id,
        summary: document.text.trim().split("\n").slice(0, 4).join("\n"),
      },
    };
  }
);

export default router;
