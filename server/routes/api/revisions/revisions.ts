import path from "node:path";
import Router from "koa-router";
import contentDisposition from "content-disposition";
import { escapeRegExp } from "es-toolkit/compat";
import mime from "mime-types";
import { ExportContentType, UserRole } from "@shared/types";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import slugify from "@shared/utils/slugify";
import { ValidationError, IncorrectEditionError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Attachment, Document, Revision } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import TextBundleHelper from "@server/models/helpers/TextBundleHelper";
import { authorize } from "@server/policies";
import { presentPolicies, presentRevision } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { streamZipResponse } from "@server/utils/koa";
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
        includeContent: false,
        includeViews: false,
      });
      authorize(user, "listRevisions", document);
    } else if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
        includeViews: false,
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
  async (ctx: APIContext<T.RevisionsUpdateReq>) => {
    const { id, name } = ctx.input.body;
    const { user } = ctx.state.auth;

    const revision = await Revision.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(revision.documentId, {
      userId: user.id,
      includeContent: false,
      includeViews: false,
    });
    authorize(user, "update", document);
    authorize(user, "update", revision);

    revision.name = name;
    await revision.save();

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
      transaction,
      lock: {
        of: Revision,
        level: transaction.LOCK.UPDATE,
      },
    });
    const document = await Document.findByPk(revision.documentId, {
      userId: user.id,
      includeContent: false,
      includeViews: false,
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
      includeContent: false,
      includeViews: false,
    });
    authorize(user, "listRevisions", document);

    let contentType: string;
    let content: string;

    // A TextBundle is a directory of files, so unlike the other formats it has
    // no self-contained single-file form to fall back to.
    const isTextBundle = !!accept?.includes(ExportContentType.TextBundle);

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
    } else if (isTextBundle || accept?.includes("text/markdown")) {
      contentType = "text/markdown";
      content = await DocumentHelper.toMarkdown(revision, {
        commonMark: true,
      });
    } else {
      ctx.body = {
        data: await DocumentHelper.toMarkdown(revision, { commonMark: true }),
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

    if (isTextBundle) {
      const root = `${fileName}.${TextBundleHelper.bundleExtension}`;
      const usedAssetNames = new Set<string>();

      streamZipResponse(
        ctx,
        `${fileName}.${TextBundleHelper.packExtension}`,
        async (zip) => {
          for (const attachment of attachments) {
            const reference = TextBundleHelper.assetPath(
              attachment.name,
              usedAssetNames
            );
            zip.addBuffer(
              await AttachmentHelper.readBuffer(attachment),
              path.join(root, reference),
              { mtime: attachment.updatedAt }
            );

            content = content.replace(
              new RegExp(escapeRegExp(attachment.redirectUrl), "g"),
              encodeURI(reference)
            );
          }

          zip.addBuffer(
            Buffer.from(TextBundleHelper.info(document, revision.id)),
            path.join(root, TextBundleHelper.infoFileName),
            { mtime: revision.updatedAt }
          );
          zip.addBuffer(
            Buffer.from(content),
            path.join(root, TextBundleHelper.textFileName),
            { mtime: revision.updatedAt }
          );
        }
      );
      return;
    }

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

    streamZipResponse(ctx, `${fileName}.zip`, async (zip) => {
      for (const attachment of attachments) {
        const location = path.join(
          "attachments",
          `${attachment.id}.${mime.extension(attachment.contentType)}`
        );
        zip.addBuffer(await AttachmentHelper.readBuffer(attachment), location, {
          mtime: attachment.updatedAt,
        });

        content = content.replace(
          new RegExp(escapeRegExp(attachment.redirectUrl), "g"),
          location
        );
      }

      zip.addBuffer(Buffer.from(content), `${fileName}.${extension}`, {
        mtime: revision.updatedAt,
      });
    });
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
      includeContent: false,
      includeViews: false,
    });
    authorize(user, "listRevisions", document);

    // History remains visible for a document in the trash,
    // but only to those that could restore it.
    if (document.deletedAt) {
      authorize(user, "restore", document);
    }

    const revisions = await Revision.findAll({
      attributes: {
        exclude: ["content", "text"],
      },
      where: {
        documentId: document.id,
      },
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
      paranoid: false,
    });

    const data = await Promise.all(
      revisions.map((revision) =>
        presentRevision(revision, { includeContent: false })
      )
    );

    ctx.body = {
      pagination: ctx.state.pagination,
      data,
      policies: presentPolicies(user, revisions),
    };
  }
);

export default router;
