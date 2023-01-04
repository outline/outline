import Router from "koa-router";
import { Op } from "sequelize";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { Document, Revision } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import { authorize } from "@server/policies";
import { presentRevision } from "@server/presenters";
import { APIContext } from "@server/types";
import slugify from "@server/utils/slugify";
import { assertPresent, assertSort, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("revisions.info", auth(), async (ctx: APIContext) => {
  const { id } = ctx.request.body;
  assertUuid(id, "id is required");
  const { user } = ctx.state.auth;
  const revision = await Revision.findByPk(id, {
    rejectOnEmpty: true,
  });

  const document = await Document.findByPk(revision.documentId, {
    userId: user.id,
  });
  authorize(user, "read", document);

  const before = await revision.previous();

  ctx.body = {
    data: await presentRevision(
      revision,
      await DocumentHelper.diff(before, revision, {
        includeTitle: false,
        includeStyles: false,
      })
    ),
  };
});

router.post("revisions.diff", auth(), async (ctx: APIContext) => {
  const { id, compareToId } = ctx.request.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state.auth;
  const revision = await Revision.findByPk(id, {
    rejectOnEmpty: true,
  });
  const document = await Document.findByPk(revision.documentId, {
    userId: user.id,
  });
  authorize(user, "read", document);

  let before;
  if (compareToId) {
    assertUuid(compareToId, "compareToId must be a UUID");
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
    before = await revision.previous();
  }

  const accept = ctx.request.headers["accept"];
  const content = await DocumentHelper.diff(before, revision);

  if (accept?.includes("text/html")) {
    ctx.set("Content-Type", "text/html");
    ctx.set(
      "Content-Disposition",
      `attachment; filename="${slugify(document.titleWithDefault)}-${
        revision.id
      }.html"`
    );
    ctx.body = content;
    return;
  }

  ctx.body = {
    data: content,
  };
});

router.post("revisions.list", auth(), pagination(), async (ctx: APIContext) => {
  let { direction } = ctx.request.body;
  const { documentId, sort = "updatedAt" } = ctx.request.body;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  assertSort(sort, Revision);
  assertPresent(documentId, "documentId is required");

  const { user } = ctx.state.auth;
  const document = await Document.findByPk(documentId, {
    userId: user.id,
  });
  authorize(user, "read", document);

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
  };
});

export default router;
