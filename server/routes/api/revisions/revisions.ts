import path from "node:path";
import Router from "koa-router";
import contentDisposition from "content-disposition";
import JSZip from "jszip";
import escapeRegExp from "lodash/escapeRegExp";
import mime from "mime-types";
import { UserRole } from "@shared/types";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import slugify from "@shared/utils/slugify";
import { ValidationError, IncorrectEditionError } from "@server/errors";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Attachment, Document, Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { authorize } from "@server/policies";
import { presentPolicies, presentRevision } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import ZipHelper from "@server/utils/ZipHelper";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "revisions.info",
  auth(),
  validate(T.RevisionsInfoSchema),
  async (ctx: APIContext<T.RevisionsInfoReq>) => {
    const { id, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    let revision: Revision;

    if (id) {
      revision = await Revision.findByPk(id, {
        rejectOnEmpty: true,
      });

      const document = await Document.findByPk(revision.documentId, {
        userId: user.id,
      });
      authorize(user, "listRevisions", document);
    } else if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
      });
      authorize(user, "listRevisions", document);
      revision = Revision.buildFromDocument(document);
      revision.id = RevisionHelper.latestId(document.id);
      revision.user = document.updatedBy;
    } else {
      throw ValidationError("Either id or documentId must be provided");
    }

    ctx.body = {
      data: await presentRevision(revision),
      policies: presentPolicies(user, [revision]),
    };
  }
);

router.post(
  "revisions.update",
  auth(),
  validate(T.RevisionsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.RevisionsUpdateReq>) => {
    const { id, name } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const revision = await Revision.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(revision.documentId, {
      userId: user.id,
    });
    authorize(user, "update", document);
    authorize(user, "update", revision);

    revision.name = name;
    await revision.save({ transaction });

    ctx.body = {
      data: await presentRevision(revision),
      policies: presentPolicies(user, [revision]),
    };
  }
);

router.post(
  "revisions.delete",
  auth({ role: UserRole.Admin }),
  validate(T.RevisionsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.RevisionsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const revision = await Revision.findByPk(id, {
      rejectOnEmpty: true,
      lock: {
        of: Revision,
        level: transaction.LOCK.UPDATE,
      },
    });
    const document = await Document.findByPk(revision.documentId, {
      userId: user.id,
    });
    authorize(user, "read", document);
    authorize(user, "delete", revision);

    await revision.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "revisions.export",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.RevisionsExportSchema),
  async (ctx: APIContext<T.RevisionsExportReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const accept = ctx.request.headers["accept"];

    const revision = await Revision.findByPk(id, {
      rejectOnEmpty: true,
    });

    const document = await Document.findByPk(revision.documentId, {
      userId: user.id,
      rejectOnEmpty: true,
    });
    authorize(user, "listRevisions", document);

    let contentType: string;
    let content: string;

    if (accept?.includes("text/html")) {
      contentType = "text/html";
      content = await DocumentHelper.toHTML(revision, {
        centered: true,
        includeMermaid: true,
      });
    } else if (accept?.includes("application/pdf")) {
      throw IncorrectEditionError(
        "PDF export is not available in the community edition"
      );
    } else if (accept?.includes("text/markdown")) {
      contentType = "text/markdown";
      content = await DocumentHelper.toMarkdown(revision);
    } else {
      ctx.body = {
        data: await DocumentHelper.toMarkdown(revision),
      };
      return;
    }

    // Override the extension for Markdown as it's incorrect in the mime-types
    // library until a new release > 2.1.35
    const extension =
      contentType === "text/markdown" ? "md" : mime.extension(contentType);

    const fileName = slugify(revision.title);
    const attachmentIds = ProsemirrorHelper.parseAttachmentIds(
      DocumentHelper.toProsemirror(revision)
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
      ctx.set(
        "Content-Disposition",
        contentDisposition(`${fileName}.${extension}`, {
          type: "attachment",
        })
      );
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
      date: revision.updatedAt,
    });

    ctx.set("Content-Type", "application/zip");
    ctx.set(
      "Content-Disposition",
      contentDisposition(`${fileName}.zip`, {
        type: "attachment",
      })
    );
    ctx.body = zip.generateNodeStream(ZipHelper.defaultStreamOptions);
  }
);

router.post(
  "revisions.list",
  auth(),
  pagination(),
  validate(T.RevisionsListSchema),
  async (ctx: APIContext<T.RevisionsListReq>) => {
    const { direction, documentId, sort } = ctx.input.body;
    const { user } = ctx.state.auth;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      paranoid: false,
    });
    authorize(user, "listRevisions", document);

    const revisions = await Revision.findAll({
      where: {
        documentId: document.id,
      },
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
      paranoid: false,
    });
    const data = await Promise.all(
      revisions.map((revision) => presentRevision(revision))
    );

    ctx.body = {
      pagination: ctx.state.pagination,
      data,
      policies: presentPolicies(user, revisions),
    };
  }
);

export default router;
