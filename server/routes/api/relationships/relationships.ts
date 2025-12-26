import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, Relationship } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentRelationship,
  presentDocument,
  presentPolicies,
} from "@server/presenters";
import type { APIContext } from "@server/types";
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
        rejectOnEmpty: true,
      }
    );
    authorize(user, "read", reverseDocument);

    const documents = [document, reverseDocument];

    ctx.body = {
      data: {
        relationship: presentRelationship(relationship),
        documents: await Promise.all(
          documents.map((doc: Document) => presentDocument(ctx, doc))
        ),
      },
      policies: presentPolicies(user, documents),
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
    const where = ctx.input.body || {};

    const relationships = await Relationship.findAll({
      where,
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const documents = await Document.findByIds(
      relationships.flatMap((relationship) =>
        where.reverseDocumentId
          ? relationship.documentId
          : relationship.reverseDocumentId
      ),
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
        policies: presentPolicies(user, documents),
      },
      policies,
    };
  }
);

export default router;
