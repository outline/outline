import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Relationship } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentRelationship,
  presentDocument,
  presentPolicies,
} from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "relationships.create",
  auth(),
  validate(T.RelationshipsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.RelationshipsCreateReq>) => {
    const { transaction } = ctx.state;
    const { type, documentId, reverseDocumentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    // Verify both documents exist and user has access
    const [document, reverseDocument] = await Promise.all([
      Document.findByPk(documentId, {
        userId: user.id,
        transaction,
      }),
      Document.findByPk(reverseDocumentId, {
        userId: user.id,
        transaction,
      }),
    ]);

    if (!document) {
      ctx.throw(404, "Document not found");
    }
    if (!reverseDocument) {
      ctx.throw(404, "Reverse document not found");
    }

    // Check if relationship already exists
    const existingRelationship = await Relationship.findOne({
      where: {
        type,
        documentId,
        reverseDocumentId,
        userId: user.id,
      },
      transaction,
    });

    if (existingRelationship) {
      ctx.throw(400, "Relationship already exists");
    }

    const relationship = await Relationship.create(
      {
        type,
        documentId,
        reverseDocumentId,
        userId: user.id,
      },
      { transaction }
    );

    ctx.body = {
      data: presentRelationship(relationship),
      policies: presentPolicies(user, [relationship]),
    };
  }
);

router.post(
  "relationships.list",
  auth(),
  pagination(),
  validate(T.RelationshipsListSchema),
  async (ctx: APIContext<T.RelationshipsListReq>) => {
    const { user } = ctx.state.auth;
    const { type, documentId, reverseDocumentId } = ctx.input.body || {};

    const where: Record<string, unknown> = {
      userId: user.id,
    };

    if (type) {
      where.type = type;
    }

    if (documentId) {
      where.documentId = documentId;
    }

    if (reverseDocumentId) {
      where.reverseDocumentId = reverseDocumentId;
    }

    const relationships = await Relationship.findAll({
      where,
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    // Get all related documents that the user has access to
    const documentIds = [
      ...new Set([
        ...relationships.map((r) => r.documentId),
        ...relationships.map((r) => r.reverseDocumentId),
      ]),
    ];

    const documents = documentIds.length
      ? await Document.withMembershipScope(user.id).findAll({
          where: {
            id: documentIds,
          },
        })
      : [];

    const policies = presentPolicies(user, [...documents, ...relationships]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        relationships: relationships.map(presentRelationship),
        documents: await Promise.all(
          documents.map((document: Document) => presentDocument(ctx, document))
        ),
      },
      policies,
    };
  }
);

router.post(
  "relationships.delete",
  auth(),
  validate(T.RelationshipsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.RelationshipsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const relationship = await Relationship.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!relationship) {
      ctx.throw(404, "Relationship not found");
    }

    authorize(user, "delete", relationship);

    await relationship.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
