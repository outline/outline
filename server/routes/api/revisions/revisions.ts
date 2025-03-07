import Router from "koa-router";
import { Op } from "sequelize";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import slugify from "@shared/utils/slugify";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { authorize } from "@server/policies";
import { presentPolicies, presentRevision } from "@server/presenters";
import { APIContext } from "@server/types";
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
    let before: Revision | null, after: Revision;

    if (id) {
      const revision = await Revision.findByPk(id, {
        rejectOnEmpty: true,
      });

      const document = await Document.findByPk(revision.documentId, {
        userId: user.id,
      });
      authorize(user, "listRevisions", document);
      after = revision;
      before = await revision.before();
    } else if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
      });
      authorize(user, "listRevisions", document);
      after = Revision.buildFromDocument(document);
      after.id = RevisionHelper.latestId(document.id);
      after.user = document.updatedBy;

      before = await Revision.findLatest(documentId);
    } else {
      throw ValidationError("Either id or documentId must be provided");
    }

    ctx.body = {
      data: await presentRevision(
        after,
        await DocumentHelper.diff(before, after, {
          includeTitle: false,
          includeStyles: false,
        })
      ),
      policies: presentPolicies(user, [after]),
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
  "revisions.diff",
  auth(),
  validate(T.RevisionsDiffSchema),
  async (ctx: APIContext<T.RevisionsDiffReq>) => {
    const { id, compareToId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const revision = await Revision.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(revision.documentId, {
      userId: user.id,
    });
    authorize(user, "listRevisions", document);

    let before;
    if (compareToId) {
      before = await Revision.findOne({
        where: {
          id: compareToId,
          documentId: revision.documentId,
          createdAt: {
            [Op.lt]: revision.createdAt,
          },
        },
      });
      if (!before) {
        throw ValidationError(
          "Revision could not be found, compareToId must be a revision of the same document before the provided revision"
        );
      }
    } else {
      before = await revision.before();
    }

    const accept = ctx.request.headers["accept"];
    const content = await DocumentHelper.diff(before, revision);

    if (accept?.includes("text/html")) {
      const name = `${slugify(document.titleWithDefault)}-${revision.id}.html`;
      ctx.set("Content-Type", "text/html");
      ctx.attachment(name);
      ctx.body = content;
      return;
    }

    ctx.body = {
      data: content,
      policies: presentPolicies(user, [revision]),
    };
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
