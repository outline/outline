import Router from "koa-router";
import { WhereOptions } from "sequelize";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, Relationship } from "@server/models";
import { authorize, can } from "@server/policies";
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
  "relationships.info",
  auth(),
  validate(T.RelationshipsInfoSchema),
  async (ctx: APIContext<T.RelationshipsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const relationship = await Relationship.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(relationship.documentId, {
      userId: user.id,
      rejectOnEmpty: true,
    });
    authorize(user, "read", document);

    const reverseDocument = await Document.findByPk(
      relationship.reverseDocumentId,
      {
        userId: user.id,
      }
    );

    const documents = [document];

    if (reverseDocument && can(user, "read", reverseDocument)) {
      documents.push(reverseDocument);
    }

    const policies = presentPolicies(user, [relationship, ...documents]);

    ctx.body = {
      data: {
        relationship: presentRelationship(relationship),
        documents: await Promise.all(
          documents.map((doc: Document) => presentDocument(ctx, doc))
        ),
      },
      policies,
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

    const where: WhereOptions<Relationship> = {};

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

    const documents = await Document.findByIds(
      relationships.map((relationship) => relationship.reverseDocumentId),
      { userId: user.id }
    );

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
