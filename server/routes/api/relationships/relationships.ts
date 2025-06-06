import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, Relationship } from "@server/models";
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

export default router;

